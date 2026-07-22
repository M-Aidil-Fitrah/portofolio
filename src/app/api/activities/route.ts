import { NextResponse } from "next/server";
import { getPersistedPublishedActivities } from "@/lib/activity-persistence";

export async function GET() {
  const posts = await getPersistedPublishedActivities();
  return NextResponse.json({ posts });
}
