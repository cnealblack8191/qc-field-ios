import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { ApiError, type FieldApi } from "./api/contract";
import { demoServer } from "./api/demo";
import { HttpFieldApi } from "./api/http";
import { forgetPhoto, haptic, newId, secureSession } from "./device";
import { applyOp, applyOps, supersedes, type FieldOp } from "./ops";
import { validateOp } from "./rules";
import type { FieldSnapshot, FieldUser } from "./types";

/**
 * The field app's single source of truth.
 *
 * Screens read `view` = last server snapshot + every op still in the outbox.
 * Screens write by `enqueue(op)`, which lands the op on disk before anything
 * is sent. The sync loop drains the outbox in order whenever there is a
 * signal, and a failed send never loses an op: it is retried with backoff,
 * or, if the server refuses it outright, kept and shown on the Sync tab until
 * the inspector dismisses it.
 */

export const DEFAULT_SERVER = "https://qcfield.ecinc.us";

type Mode = "demo" | "live";

interface Session {
  mode: Mode;
  serverUrl: string;
  token: string;
  user: FieldUser;
}

export interface QueuedOp {
  op: FieldOp;
  attempts: number;
  lastError: string | null;
  /** Set when the server refused the op; it will not be retried. */
  rejected: string | null;
}

type SyncState = "idle" | "syncing" | "offline" | "error" | "auth";

interface FieldStore {
  ready: boolean;
  session: Session | null;
  view: FieldSnapshot | null;
  outbox: QueuedOp[];
  pendingCount: number;
  rejectedCount: number;
  online: boolean;
  syncState: SyncState;
  lastSyncedAt: string | null;
  simulateOffline: boolean;
  signIn(input: { mode: Mode; email: string; password: string; serverUrl?: string }): Promise<void>;
  signOut(): Promise<void>;
  /** Queue a write. Returns an error message instead if the op is not allowed. */
  enqueue(op: DistributiveOmit<FieldOp, "id" | "createdAt"> & { id?: string }): string | null;
  syncNow(): Promise<void>;
  dismiss(opId: string): void;
  setSimulateOffline(value: boolean): void;
  resetDemo(): Promise<void>;
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

const SESSION_KEY = "field.session.v1";
const snapshotKey = (userId: string) => `field.snapshot.v1.${userId}`;
const outboxKey = (userId: string) => `field.outbox.v1.${userId}`;

const Context = createContext<FieldStore | null>(null);

function apiFor(session: Pick<Session, "mode" | "serverUrl">): FieldApi {
  return session.mode === "demo" ? demoServer : new HttpFieldApi(session.serverUrl);
}

function photosOf(op: FieldOp) {
  if (op.kind === "punch.create" || op.kind === "pin.inspect") return op.photoUris;
  if (op.kind === "report.photo") return [op.photoUri];
  return [];
}

export function FieldStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<FieldSnapshot | null>(null);
  const [outbox, setOutbox] = useState<QueuedOp[]>([]);
  const [netOnline, setNetOnline] = useState(true);
  const [simulateOffline, setSimulateOfflineState] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // The sync loop reads the latest values through refs so a long drain never
  // acts on a stale closure.
  const sessionRef = useRef(session);
  const outboxRef = useRef(outbox);
  const snapshotRef = useRef(snapshot);
  const syncing = useRef(false);
  const backoff = useRef({ delay: 2_000, timer: null as ReturnType<typeof setTimeout> | null });
  sessionRef.current = session;
  snapshotRef.current = snapshot;

  const online = netOnline && !simulateOffline;
  const onlineRef = useRef(online);
  onlineRef.current = online;

  const persistOutbox = useCallback((next: QueuedOp[]) => {
    outboxRef.current = next;
    setOutbox(next);
    const current = sessionRef.current;
    if (current) void AsyncStorage.setItem(outboxKey(current.user.id), JSON.stringify(next)).catch(() => undefined);
  }, []);

  const persistSnapshot = useCallback((next: FieldSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    void AsyncStorage.setItem(snapshotKey(next.user.id), JSON.stringify(next)).catch(() => undefined);
  }, []);

  // Restore the last session, its cached snapshot and its outbox, so the app
  // opens straight into the walk with no signal.
  useEffect(() => {
    (async () => {
      try {
        const stored = await secureSession.get(SESSION_KEY);
        if (stored) {
          const restored = JSON.parse(stored) as Session;
          const [cached, queued] = await Promise.all([
            AsyncStorage.getItem(snapshotKey(restored.user.id)),
            AsyncStorage.getItem(outboxKey(restored.user.id))
          ]);
          sessionRef.current = restored;
          setSession(restored);
          if (cached) {
            const parsed = JSON.parse(cached) as FieldSnapshot;
            snapshotRef.current = parsed;
            setSnapshot(parsed);
            setLastSyncedAt(parsed.fetchedAt);
          }
          if (queued) {
            const parsed = JSON.parse(queued) as QueuedOp[];
            outboxRef.current = parsed;
            setOutbox(parsed);
          }
        }
      } catch {
        // A corrupt cache is not worth a crash; the inspector signs in again.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isInternetReachable` is null while unknown; only a definite false
      // counts as offline, so a slow probe does not stall the queue.
      setNetOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  const refresh = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || !onlineRef.current) return;
    const fresh = await apiFor(current).fetchSnapshot(current.token);
    persistSnapshot(fresh);
    setLastSyncedAt(fresh.fetchedAt);
  }, [persistSnapshot]);

  const drain = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || syncing.current) return;
    if (!onlineRef.current) {
      setSyncState("offline");
      return;
    }
    syncing.current = true;
    setSyncState("syncing");
    const api = apiFor(current);
    let drained = false;
    try {
      for (;;) {
        const next = outboxRef.current.find((entry) => !entry.rejected);
        if (!next) break;
        try {
          await api.sendOp(current.token, next.op);
          // Fold the acknowledged op into the cached snapshot, so it does not
          // flicker out between leaving the queue and the next fetch.
          const base = snapshotRef.current;
          if (base) persistSnapshot(applyOp(base, next.op, { local: false, userId: current.user.id }));
          persistOutbox(outboxRef.current.filter((entry) => entry.op.id !== next.op.id));
          if (current.mode === "live") photosOf(next.op).forEach((uri) => void forgetPhoto(uri));
        } catch (error) {
          const failure = error instanceof ApiError ? error : new ApiError("That did not send.", "retry");
          if (failure.disposition === "rejected") {
            persistOutbox(
              outboxRef.current.map((entry) =>
                entry.op.id === next.op.id ? { ...entry, rejected: failure.message, lastError: failure.message } : entry
              )
            );
            haptic.warning();
            continue;
          }
          persistOutbox(
            outboxRef.current.map((entry) =>
              entry.op.id === next.op.id ? { ...entry, attempts: entry.attempts + 1, lastError: failure.message } : entry
            )
          );
          throw failure;
        }
      }
      await refresh();
      backoff.current.delay = 2_000;
      setSyncState("idle");
      drained = true;
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError("Sync failed.", "retry");
      if (failure.disposition === "auth") {
        setSyncState("auth");
      } else {
        setSyncState(onlineRef.current ? "error" : "offline");
        // Retry with exponential backoff, capped at a minute.
        const delay = backoff.current.delay;
        backoff.current.delay = Math.min(delay * 2, 60_000);
        if (backoff.current.timer) clearTimeout(backoff.current.timer);
        backoff.current.timer = setTimeout(() => void drainRef.current(), delay);
      }
    } finally {
      syncing.current = false;
      // Anything queued while the last fetch was in flight goes now, rather
      // than waiting for the next tap or reconnect.
      if (drained && outboxRef.current.some((entry) => !entry.rejected)) setTimeout(() => void drainRef.current(), 0);
    }
  }, [persistOutbox, persistSnapshot, refresh]);

  const drainRef = useRef(drain);
  drainRef.current = drain;

  // Back into coverage, or back into the app, is when to push and pull.
  useEffect(() => {
    if (online && session) void drain();
    if (!online && session) setSyncState("offline");
  }, [online, session, drain]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void drainRef.current();
    });
    return () => subscription.remove();
  }, []);

  const view = useMemo(() => {
    if (!snapshot) return null;
    return applyOps(snapshot, outbox.filter((entry) => !entry.rejected).map((entry) => entry.op), snapshot.user.id);
  }, [snapshot, outbox]);

  const enqueue = useCallback<FieldStore["enqueue"]>(
    (partial) => {
      const current = sessionRef.current;
      const base = snapshotRef.current;
      if (!current || !base) return "Sign in first.";
      const op = { ...partial, id: partial.id ?? newId(), createdAt: new Date().toISOString() } as FieldOp;
      const pending = outboxRef.current.filter((entry) => !entry.rejected);
      const currentView = applyOps(base, pending.map((entry) => entry.op), current.user.id);
      const problem = validateOp(currentView, op, current.user.id);
      if (problem) return problem;
      const kept = outboxRef.current.filter((entry) => !supersedes(op, entry.op));
      persistOutbox([...kept, { op, attempts: 0, lastError: null, rejected: null }]);
      void drainRef.current();
      return null;
    },
    [persistOutbox]
  );

  const signIn = useCallback<FieldStore["signIn"]>(
    async ({ mode, email, password, serverUrl }) => {
      const target = { mode, serverUrl: (serverUrl || DEFAULT_SERVER).trim() };
      const api = apiFor(target);
      if (mode === "demo") demoServer.offline = false;
      const { token, user } = await api.signIn(email.trim(), password);
      const next: Session = { ...target, token, user };
      // Outbox and cache are per user, so a shared iPad never shows one
      // inspector's queued work to the next.
      const [cached, queued] = await Promise.all([
        AsyncStorage.getItem(snapshotKey(user.id)).catch(() => null),
        AsyncStorage.getItem(outboxKey(user.id)).catch(() => null)
      ]);
      sessionRef.current = next;
      await secureSession.set(SESSION_KEY, JSON.stringify(next));
      const restoredOutbox = queued ? (JSON.parse(queued) as QueuedOp[]) : [];
      outboxRef.current = restoredOutbox;
      setOutbox(restoredOutbox);
      if (cached) {
        const parsed = JSON.parse(cached) as FieldSnapshot;
        snapshotRef.current = parsed;
        setSnapshot(parsed);
      }
      const fresh = await api.fetchSnapshot(token);
      persistSnapshot(fresh);
      setLastSyncedAt(fresh.fetchedAt);
      setSession(next);
      setSimulateOfflineState(false);
    },
    [persistSnapshot]
  );

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    if (current) await apiFor(current).signOut(current.token).catch(() => undefined);
    await secureSession.remove(SESSION_KEY);
    if (current) await AsyncStorage.removeItem(snapshotKey(current.user.id)).catch(() => undefined);
    // The outbox is deliberately kept: it is the only copy of unsynced work,
    // and it syncs the next time this inspector signs in.
    sessionRef.current = null;
    snapshotRef.current = null;
    outboxRef.current = [];
    setSession(null);
    setSnapshot(null);
    setOutbox([]);
    setSyncState("idle");
  }, []);

  const dismiss = useCallback(
    (opId: string) => {
      persistOutbox(outboxRef.current.filter((entry) => entry.op.id !== opId));
    },
    [persistOutbox]
  );

  const setSimulateOffline = useCallback((value: boolean) => {
    demoServer.offline = value;
    onlineRef.current = netOnline && !value;
    setSimulateOfflineState(value);
  }, [netOnline]);

  const resetDemo = useCallback(async () => {
    await demoServer.reset();
    persistOutbox([]);
    await refresh().catch(() => undefined);
  }, [persistOutbox, refresh]);

  const pendingCount = outbox.filter((entry) => !entry.rejected).length;
  const rejectedCount = outbox.length - pendingCount;

  const value = useMemo<FieldStore>(
    () => ({
      ready,
      session,
      view,
      outbox,
      pendingCount,
      rejectedCount,
      online,
      syncState,
      lastSyncedAt,
      simulateOffline,
      signIn,
      signOut,
      enqueue,
      syncNow: drain,
      dismiss,
      setSimulateOffline,
      resetDemo
    }),
    [ready, session, view, outbox, pendingCount, rejectedCount, online, syncState, lastSyncedAt, simulateOffline, signIn, signOut, enqueue, drain, dismiss, setSimulateOffline, resetDemo]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useField() {
  const store = useContext(Context);
  if (!store) throw new Error("useField must be used inside FieldStoreProvider");
  return store;
}

/** The view, for screens that only render once signed in. */
export function useView() {
  const { view } = useField();
  if (!view) throw new Error("No field snapshot loaded");
  return view;
}
