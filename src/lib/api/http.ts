import type { FieldOp } from "../ops";
import type { FieldSnapshot, FieldUser } from "../types";
import { ApiError, type FieldApi } from "./contract";

/**
 * Client for the mobile API described in docs/FIELD_IOS_API.md.
 *
 * The server side of this contract does not exist yet: the web field app uses
 * cookie sessions and server actions, which a native app cannot call. Until
 * `/api/field/v1` ships, signing in against a real server reports that
 * plainly rather than failing in some stranger way.
 */
export class HttpFieldApi implements FieldApi {
  readonly mode = "live" as const;

  constructor(private readonly baseUrl: string) {}

  private url(path: string) {
    return `${this.baseUrl.replace(/\/+$/, "")}/api/field/v1${path}`;
  }

  private async request(path: string, init: RequestInit & { token?: string; timeoutMs?: number }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 20_000);
    let response: Response;
    try {
      response = await fetch(this.url(path), {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
          ...(init.headers ?? {})
        }
      });
    } catch {
      throw new ApiError("Could not reach the server.", "retry");
    } finally {
      clearTimeout(timer);
    }

    if (response.ok) return response;

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    const message = body?.error ?? `The server answered ${response.status}.`;
    if (response.status === 401) throw new ApiError("Your session has ended. Sign in again.", "auth");
    if (response.status === 404 && path === "/session") {
      throw new ApiError("This server does not offer the mobile API yet. Use the demo, or the web field app.", "rejected");
    }
    // 408, 429 and 5xx are worth retrying; any other refusal is final.
    if (response.status === 408 || response.status === 429 || response.status >= 500) throw new ApiError(message, "retry");
    throw new ApiError(message, "rejected");
  }

  async signIn(email: string, password: string) {
    const response = await this.request("/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, device: "ios" })
    });
    return (await response.json()) as { token: string; user: FieldUser };
  }

  async signOut(token: string) {
    await this.request("/session", { method: "DELETE", token }).catch(() => undefined);
  }

  async fetchSnapshot(token: string) {
    const response = await this.request("/snapshot", { method: "GET", token, timeoutMs: 45_000 });
    return (await response.json()) as FieldSnapshot;
  }

  async sendOp(token: string, op: FieldOp) {
    const photoUris = "photoUris" in op ? op.photoUris : op.kind === "report.photo" ? [op.photoUri] : [];
    const form = new FormData();
    form.append("op", JSON.stringify(op));
    photoUris.forEach((uri, index) => {
      // React Native's FormData takes a file descriptor object in place of a Blob.
      form.append("photo", { uri, name: `photo-${index}.jpg`, type: "image/jpeg" } as unknown as Blob);
    });
    await this.request("/ops", {
      method: "POST",
      token,
      body: form,
      headers: { "Idempotency-Key": op.id },
      timeoutMs: photoUris.length ? 120_000 : 20_000
    });
  }
}
