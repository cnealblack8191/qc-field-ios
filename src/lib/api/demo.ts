import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildDemoSnapshot, DEMO_USER } from "@/demo/seed";
import { applyOp, type FieldOp } from "../ops";
import { validateOp } from "../rules";
import type { FieldSnapshot } from "../types";
import { ApiError, type FieldApi } from "./contract";

const STATE_KEY = "demo.server.v1";
const SEEN_KEY = "demo.server.seen.v1";
const LATENCY_MS = 450;

/**
 * An on-device stand-in for the QC server, so the app can be demonstrated and
 * trained on without an account or a signal. It writes through the same
 * `applyOp` and `validateOp` the screens use, persists across launches, and
 * honours the "simulate no signal" switch so the offline queue can be shown.
 */
class DemoServer implements FieldApi {
  readonly mode = "demo" as const;
  offline = false;
  private state: FieldSnapshot | null = null;
  private seen = new Set<string>();

  private async load() {
    if (this.state) return this.state;
    try {
      const [stored, seen] = await Promise.all([AsyncStorage.getItem(STATE_KEY), AsyncStorage.getItem(SEEN_KEY)]);
      this.state = stored ? (JSON.parse(stored) as FieldSnapshot) : buildDemoSnapshot();
      this.seen = new Set(seen ? (JSON.parse(seen) as string[]) : []);
    } catch {
      this.state = buildDemoSnapshot();
    }
    return this.state;
  }

  private async save() {
    try {
      await AsyncStorage.multiSet([
        [STATE_KEY, JSON.stringify(this.state)],
        [SEEN_KEY, JSON.stringify([...this.seen])]
      ]);
    } catch {
      // Storage full or blocked: the demo keeps working in memory.
    }
  }

  private async network() {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
    if (this.offline) throw new ApiError("No signal.", "retry");
  }

  async reset() {
    this.state = buildDemoSnapshot();
    this.seen.clear();
    await this.save();
  }

  async signIn(email: string, _password: string, shared: boolean) {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
    // Like the server: a shared phone gets 12 hours, a personal demo never ends.
    const expiresAt = shared ? new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() : null;
    return { token: "demo-token", user: { ...DEMO_USER, email: email.trim() || DEMO_USER.email }, expiresAt };
  }

  async signOut() {}

  async fetchSnapshot() {
    await this.network();
    const state = await this.load();
    return { ...state, fetchedAt: new Date().toISOString() };
  }

  async sendOp(_token: string, op: FieldOp) {
    await this.network();
    const state = await this.load();
    // Idempotent on the client id, as the real server is.
    if (this.seen.has(op.id)) return;
    const problem = validateOp(state, op, DEMO_USER.id);
    if (problem) throw new ApiError(problem, "rejected");
    this.state = applyOp(state, op, { local: false, userId: DEMO_USER.id });
    this.seen.add(op.id);
    await this.save();
  }
}

export const demoServer = new DemoServer();
