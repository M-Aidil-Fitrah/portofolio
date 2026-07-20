import "server-only";

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 5;

interface LoginAttemptState {
  attempts: number;
  windowStartedAt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttemptState>();

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function getRequestClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

export function checkLoginRateLimit(clientKey: string) {
  pruneExpiredAttempts();
  const now = Date.now();
  const state = loginAttempts.get(clientKey);
  if (!state || state.lockedUntil <= now) {
    if (state?.lockedUntil) loginAttempts.delete(clientKey);
    return { allowed: true as const, retryAfter: 0 };
  }

  return {
    allowed: false as const,
    retryAfter: Math.max(1, Math.ceil((state.lockedUntil - now) / 1000)),
  };
}

export function recordFailedLogin(clientKey: string) {
  const now = Date.now();
  const current = loginAttempts.get(clientKey);
  const state =
    !current || now - current.windowStartedAt > LOGIN_WINDOW_MS
      ? { attempts: 0, windowStartedAt: now, lockedUntil: 0 }
      : current;

  state.attempts += 1;
  if (state.attempts >= LOGIN_ATTEMPT_LIMIT) {
    state.lockedUntil = now + LOGIN_LOCK_MS;
  }
  loginAttempts.set(clientKey, state);
  return checkLoginRateLimit(clientKey);
}

export function clearFailedLogins(clientKey: string) {
  loginAttempts.delete(clientKey);
}

function pruneExpiredAttempts() {
  if (loginAttempts.size < 500) return;
  const now = Date.now();
  for (const [key, state] of loginAttempts) {
    if (
      state.lockedUntil <= now &&
      now - state.windowStartedAt > LOGIN_WINDOW_MS
    ) {
      loginAttempts.delete(key);
    }
  }
}
