/** Public error codes only: provider messages and tokens must never reach the UI. */
export const GOOGLE_AUTH_ERRORS = {
  google_cancelled: "Google sign-in was cancelled. Select Continue with Google when you're ready.",
  google_unavailable: "Google sign-in is temporarily unavailable. Try again later, or use Telegram below if you already have an account there.",
  google_failed: "Google couldn't complete sign-in. Select Continue with Google to try again.",
  google_expired: "This sign-in attempt expired or started in another browser. Select Continue with Google to start again here.",
  google_invalid: "This sign-in link is incomplete. Select Continue with Google to start again.",
  google_network: "We couldn't finish connecting. Check your internet connection, then select Continue with Google again.",
  google_account_failed: "We couldn't open your account. Try signing in again. If this continues, contact ContextDrop support.",
  google_claim_failed: "We couldn't link your Telegram account. Open a fresh dashboard link from the Telegram bot and try again.",
  account_conflict: "You're already signed in to a different account. Return to your dashboard, or sign out there before switching accounts.",
} as const;

export type GoogleAuthError = keyof typeof GOOGLE_AUTH_ERRORS;

export function googleAuthError(value: unknown): GoogleAuthError {
  return typeof value === "string" && Object.hasOwn(GOOGLE_AUTH_ERRORS, value)
    ? value as GoogleAuthError : "google_failed";
}

export function providerError(value: unknown): GoogleAuthError {
  if (value === "access_denied") return "google_cancelled";
  if (["provider_disabled", "validation_failed", "unexpected_failure", "server_error", "temporarily_unavailable"].includes(String(value))) return "google_unavailable";
  return "google_failed";
}

export function providerRequestError(error: { status?: number; name?: string }, fallback: GoogleAuthError): GoogleAuthError {
  return error.status === 429 || (error.status ?? 0) >= 500 || error.name === "AuthRetryableFetchError"
    ? "google_unavailable" : fallback;
}

export function isSameOriginAuthRequest(request: Request, requireOrigin = true): boolean {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  return origin ? origin === new URL(request.url).origin : !requireOrigin;
}

export function parseGoogleCallback(value: unknown): { code: string; state: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => key !== "code" && key !== "state")) return null;
  if (typeof body.code !== "string" || !/^[A-Za-z0-9._~-]{1,2048}$/.test(body.code)) return null;
  if (typeof body.state !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.state)) return null;
  return { code: body.code, state: body.state };
}

export function pendingShareRedirect(cookie: string | undefined): string | null {
  if (!cookie || cookie.length > 4096) return null;
  try {
    const value = decodeURIComponent(cookie);
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return `/share?url=${encodeURIComponent(value)}`;
  } catch { return null; }
}

export function allowedAuthRedirect(destination: unknown): string {
  return destination === "/context" ? "/context" : "/dashboard";
}

export async function completeGoogleCallback(location: string, fetchImpl: typeof fetch): Promise<string> {
  const url = new URL(location);
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (url.searchParams.has("error") || fragment.has("error")) {
    return `/login?error=${providerError(url.searchParams.get("error") ?? fragment.get("error"))}`;
  }
  const input = parseGoogleCallback({ code: url.searchParams.get("code"), state: url.searchParams.get("state") });
  if (!input || url.searchParams.getAll("code").length !== 1 || url.searchParams.getAll("state").length !== 1) return "/login?error=google_invalid";
  try {
    const response = await fetchImpl("/api/auth/google/callback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify(input), signal: AbortSignal.timeout(30_000),
    });
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return "/login?error=google_failed";
    const result = data as Record<string, unknown>;
    if (response.ok && result.success === true) return allowedAuthRedirect(result.redirect);
    return `/login?error=${googleAuthError(result.error)}`;
  } catch { return "/login?error=google_network"; }
}
