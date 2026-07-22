import { NextResponse } from "next/server";
import type { ActivityPost } from "@/lib/activities";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isSameOriginRequest } from "@/lib/admin-request-security";
import {
  deletePersistedActivity,
  getPersistedActivities,
  savePersistedActivity,
} from "@/lib/activity-persistence";

function invalid(message = "Invalid activity payload.") {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asPost(value: unknown): ActivityPost | null {
  if (!value || typeof value !== "object") return null;
  const post = value as Partial<ActivityPost>;
  if (
    typeof post.slug !== "string" ||
    !post.title ||
    !post.caption ||
    !post.body ||
    typeof post.date !== "string" ||
    !Array.isArray(post.tags) ||
    !Array.isArray(post.media) ||
    !Array.isArray(post.comments)
  ) {
    return null;
  }
  return post as ActivityPost;
}

async function guard(request?: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (request && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;

  return NextResponse.json({ posts: await getPersistedActivities() });
}

export async function PUT(request: Request) {
  const blocked = await guard(request);
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as
    | { post?: unknown; currentSlug?: unknown }
    | null;
  const post = asPost(body?.post);
  const currentSlug =
    typeof body?.currentSlug === "string" ? body.currentSlug : undefined;

  if (!post) return invalid();

  const posts = await savePersistedActivity(post, currentSlug);
  return NextResponse.json({ posts, post });
}

export async function DELETE(request: Request) {
  const blocked = await guard(request);
  if (blocked) return blocked;

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return invalid("Missing activity slug.");

  const posts = await deletePersistedActivity(slug);
  return NextResponse.json({ posts });
}
