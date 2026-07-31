"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ActivityPost } from "@/lib/activities";
import {
  ADMIN_ACTIVITIES_QUERY_KEY,
  PUBLIC_ACTIVITIES_QUERY_KEY,
  deleteApiActivity,
  getApiAdminActivities,
  getApiPublishedActivities,
  saveApiActivity,
} from "@/lib/api/activity-api";
import { ApiError } from "@/lib/api/fetcher";
import { getBrowserApiQueryClient } from "@/lib/api/query-client";
import { announceAdminSessionExpiry } from "@/lib/admin-session-client";

type ActivityScope = "admin" | "public";

let currentAdminPosts: ActivityPost[] = [];

function sortPublished(posts: ActivityPost[]) {
  return [...posts]
    .filter((post) => post.status === "published")
    .sort((left, right) => {
      if (Boolean(left.pinned) !== Boolean(right.pinned)) {
        return left.pinned ? -1 : 1;
      }
      return right.date.localeCompare(left.date);
    });
}

function handleAdminError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    announceAdminSessionExpiry();
  }
}

export function useActivities(
  scope: ActivityScope = "admin",
  initialPosts?: ActivityPost[],
): ActivityPost[] {
  const query = useQuery({
    queryKey:
      scope === "admin"
        ? ADMIN_ACTIVITIES_QUERY_KEY
        : PUBLIC_ACTIVITIES_QUERY_KEY,
    queryFn:
      scope === "admin" ? getApiAdminActivities : getApiPublishedActivities,
    initialData:
      scope === "public" && initialPosts
        ? sortPublished(initialPosts)
        : undefined,
  });

  useEffect(() => {
    if (scope === "admin" && query.data) currentAdminPosts = query.data;
  }, [query.data, scope]);
  useEffect(() => {
    if (scope === "admin" && query.error) handleAdminError(query.error);
  }, [query.error, scope]);
  return query.data ?? [];
}

export function usePublishedActivities(initialPosts?: ActivityPost[]) {
  return useActivities("public", initialPosts);
}

export function isActivitySlugAvailable(
  slug: string,
  currentSlug?: string,
) {
  if (slug === currentSlug) return true;
  return !currentAdminPosts.some((post) => post.slug === slug);
}

export async function saveActivity(
  post: ActivityPost,
  currentSlug?: string,
): Promise<
  | { ok: true; post: ActivityPost }
  | { ok: false; reason: "storage" | "session" }
> {
  try {
    const saved = await saveApiActivity(post, currentSlug);
    const client = getBrowserApiQueryClient();
    await Promise.all([
      client.invalidateQueries({ queryKey: ADMIN_ACTIVITIES_QUERY_KEY }),
      client.invalidateQueries({ queryKey: PUBLIC_ACTIVITIES_QUERY_KEY }),
    ]);
    return { ok: true, post: saved };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      announceAdminSessionExpiry();
      return { ok: false, reason: "session" };
    }
    return { ok: false, reason: "storage" };
  }
}

export async function deleteActivity(
  slug: string,
): Promise<{ ok: true } | { ok: false; reason: "storage" | "session" }> {
  try {
    await deleteApiActivity(slug);
    const client = getBrowserApiQueryClient();
    await Promise.all([
      client.invalidateQueries({ queryKey: ADMIN_ACTIVITIES_QUERY_KEY }),
      client.invalidateQueries({ queryKey: PUBLIC_ACTIVITIES_QUERY_KEY }),
    ]);
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      announceAdminSessionExpiry();
      return { ok: false, reason: "session" };
    }
    return { ok: false, reason: "storage" };
  }
}
