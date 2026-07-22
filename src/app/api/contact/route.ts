import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  getRequestClientKey,
  isSameOriginRequest,
} from "@/lib/admin-request-security";
import { SOCIAL } from "@/lib/site";

const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_REQUEST_LIMIT = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = ["general", "internship", "collaboration"] as const;

interface ContactRateState {
  count: number;
  windowStartedAt: number;
}

const requestsByClient = new Map<string, ContactRateState>();

function getRateLimit(clientKey: string) {
  const now = Date.now();
  const current = requestsByClient.get(clientKey);

  if (!current || now - current.windowStartedAt >= CONTACT_WINDOW_MS) {
    requestsByClient.set(clientKey, { count: 1, windowStartedAt: now });
    return { allowed: true as const, retryAfter: 0 };
  }

  if (current.count >= CONTACT_REQUEST_LIMIT) {
    return {
      allowed: false as const,
      retryAfter: Math.max(
        1,
        Math.ceil(
          (CONTACT_WINDOW_MS - (now - current.windowStartedAt)) / 1000,
        ),
      ),
    };
  }

  current.count += 1;
  return { allowed: true as const, retryAfter: 0 };
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const rateLimit = getRateLimit(getRequestClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const name = asTrimmedString(body?.name);
  const email = asTrimmedString(body?.email);
  const category = asTrimmedString(body?.category);
  const message = asTrimmedString(body?.message);
  const company = asTrimmedString(body?.company);

  // The hidden company field is a honeypot. Return the normal response so a
  // bot cannot use the endpoint's response to tune its next attempt.
  if (company) return NextResponse.json({ ok: true });

  if (
    !name ||
    name.length > 120 ||
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    !CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ||
    !message ||
    message.length > 5000
  ) {
    return NextResponse.json({ error: "Invalid contact details." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL ?? SOCIAL.email;
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "Contact delivery is not configured." },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `[Portfolio] New ${category} message`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Category: ${category}`,
      "",
      message,
    ].join("\n"),
  });

  if (result.error) {
    return NextResponse.json({ error: "Message delivery failed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
