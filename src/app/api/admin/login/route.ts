import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  credentialsMatch,
  getAdminCredentials,
} from "@/lib/admin-auth";
import {
  checkLoginRateLimit,
  clearFailedLogins,
  getRequestClientKey,
  isSameOriginRequest,
  recordFailedLogin,
} from "@/lib/admin-request-security";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = checkLoginRateLimit(clientKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; password?: unknown }
    | null;
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (email.length > 254 || password.length > 256) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  }
  const credentials = getAdminCredentials();

  if (!credentials) {
    return NextResponse.json(
      { error: "Admin credentials are not configured." },
      { status: 503 }
    );
  }

  if (!credentialsMatch(email, password, credentials)) {
    const failed = recordFailedLogin(clientKey);
    if (!failed.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(failed.retryAfter) },
        }
      );
    }
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 }
    );
  }

  clearFailedLogins(clientKey);

  const token = createAdminSession(credentials.email);
  if (!token) {
    return NextResponse.json(
      { error: "Admin session is not configured." },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });

  return response;
}
