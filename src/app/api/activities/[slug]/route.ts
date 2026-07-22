import { NextResponse } from "next/server";
import { getPersistedActivity } from "@/lib/activity-persistence";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPersistedActivity(slug);

  if (!post || post.status !== "published") {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }

  return NextResponse.json({ post });
}
