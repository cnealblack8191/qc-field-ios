import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, AppState, Platform } from "react-native";
import { useField } from "./store";

/**
 * Face ID unlock.
 *
 * Face ID does not sign anyone in: the 45-day sign-in token already sits in
 * the Keychain, and this only decides whether the app shows itself. The face
 * never leaves the phone — iOS answers yes or no, and the app never sees it.
 * If Face ID fails (gloves, a mask, a dirty lens) the phone's passcode works.
 *
 * Asked when the app opens, and when it comes back after 15 minutes away, so
 * an inspector flipping to the camera or a text is not prompted each time.
 */

const RELOCK_AFTER_MS = 15 * 60 * 1000;
const prefKey = (userId: string) => `field.biometric.v1.${userId}`;

type Kind = "Face ID" | "Touch ID" | "Passcode";

interface LockState {
  available: boolean;
  kind: Kind;
  enabled: boolean;
  locked: boolean;
  setEnabled(value: boolean): Promise<void>;
  unlock(): Promise<boolean>;
}

const Context = createContext<LockState | null>(null);

async function readCapability(): Promise<{ available: boolean; kind: Kind }> {
  if (Platform.OS === "web") return { available: false, kind: "Passcode" };
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync()
    ]);
    const kind: Kind = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? "Face ID"
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? "Touch ID"
        : "Passcode";
    return { available: hardware && enrolled, kind };
  } catch {
    return { available: false, kind: "Passcode" };
  }
}

export function LockProvider({ children }: { children: ReactNode }) {
  const { session } = useField();
  const userId = session?.user.id ?? null;
  const [available, setAvailable] = useState(false);
  const [kind, setKind] = useState<Kind>("Face ID");
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const offeredFor = useRef<string | null>(null);

  useEffect(() => {
    void readCapability().then((capability) => {
      setAvailable(capability.available);
      setKind(capability.kind);
    });
  }, []);

  // On sign-in or launch: read this inspector's choice, lock if it is on, and
  // offer it once if they have never been asked.
  useEffect(() => {
    if (!userId) {
      setEnabledState(false);
      setLocked(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const stored = await AsyncStorage.getItem(prefKey(userId)).catch(() => null);
      if (cancelled) return;
      const on = stored === "on";
      setEnabledState(on);
      if (on && available) setLocked(true);
      if (stored === null && available && offeredFor.current !== userId) {
        offeredFor.current = userId;
        Alert.alert(`Use ${kind} to unlock?`, `Open ECI Field QC with ${kind} instead of your password. Your password is still needed every 45 days.`, [
          { text: "Not now", style: "cancel", onPress: () => void AsyncStorage.setItem(prefKey(userId), "off").catch(() => undefined) },
          {
            text: `Use ${kind}`,
            onPress: async () => {
              // Confirm it works before relying on it.
              const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Turn on ${kind}` }).catch(() => null);
              const value = result?.success ? "on" : "off";
              await AsyncStorage.setItem(prefKey(userId), value).catch(() => undefined);
              setEnabledState(value === "on");
            }
          }
        ]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, available, kind]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") backgroundedAt.current = Date.now();
      if (state === "active" && backgroundedAt.current && enabled && available) {
        if (Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled, available]);

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock ECI Field QC",
      cancelLabel: "Cancel",
      // The passcode is the fallback when Face ID cannot see a face.
      disableDeviceFallback: false
    }).catch(() => null);
    if (result?.success) setLocked(false);
    return Boolean(result?.success);
  }, []);

  const setEnabled = useCallback(
    async (value: boolean) => {
      if (!userId) return;
      if (value) {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Turn on ${kind}` }).catch(() => null);
        if (!result?.success) return;
      }
      await AsyncStorage.setItem(prefKey(userId), value ? "on" : "off").catch(() => undefined);
      setEnabledState(value);
    },
    [userId, kind]
  );

  return (
    <Context.Provider value={{ available, kind, enabled, locked: locked && enabled && available, setEnabled, unlock }}>
      {children}
    </Context.Provider>
  );
}

export function useLock() {
  const lock = useContext(Context);
  if (!lock) throw new Error("useLock must be used inside LockProvider");
  return lock;
}
