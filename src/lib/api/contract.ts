import type { FieldOp } from "../ops";
import type { FieldSnapshot, FieldUser } from "../types";

/**
 * The seam between the app and a QC server. Two implementations: the demo
 * server (on-device, no network) and the HTTP client for
 * `/api/field/v1` described in the QC repo's docs/FIELD_IOS_API.md.
 */
export interface FieldApi {
  readonly mode: "demo" | "live";
  signIn(email: string, password: string): Promise<{ token: string; user: FieldUser; expiresAt: string | null }>;
  signOut(token: string): Promise<void>;
  /** Everything assigned to the signed-in inspector. */
  fetchSnapshot(token: string): Promise<FieldSnapshot>;
  /** Send one queued op. Must be idempotent on `op.id`. */
  sendOp(token: string, op: FieldOp): Promise<void>;
}

/**
 * Why a request failed, in terms of what the outbox should do next.
 * - `retry`: the network or server hiccupped; keep the op and try later.
 * - `rejected`: the server refused this op; retrying will not help.
 * - `auth`: the session is gone; keep every op and ask the inspector to sign in.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly disposition: "retry" | "rejected" | "auth"
  ) {
    super(message);
    this.name = "ApiError";
  }
}
