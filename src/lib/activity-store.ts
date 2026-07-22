"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  activities as seedActivities,
  type ActivityPost,
} from "@/lib/activities";

type ActivityScope = "admin" | "public";

const CHANGE_EVENT = "portfolio-activities-change";

let adminPosts = seedActivities;
let publicPosts = sortPublished(seedActivities);
let adminLoaded = false;
let publicLoaded = false;
let adminRequest: Promise<void> | null = null;
let publicRequest: Promise<void> | null = null;

function sortPublished(posts: ActivityPost[]) {
  return [...posts]
    .filter((post) => post.status === "published")
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return b.date.localeCompare(a.date);
    });
}

function publishChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function setAdminPosts(posts: ActivityPost[]) {
  adminPosts = posts;
  adminLoaded = true;
  publicPosts = sortPublished(posts);
  publicLoaded = true;
  publishChange();
}

function setPublicPosts(posts: ActivityPost[]) {
  publicPosts = sortPublished(posts);
  publicLoaded = true;
  publishChange();
}

async function fetchActivities(scope: ActivityScope) {
  const url = scope === "admin" ? "/api/admin/activities" : "/api/activities";
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Activity fetch failed");
  const payload = (await response.json()) as { posts?: ActivityPost[] };
  if (!Array.isArray(payload.posts)) throw new Error("Invalid activity payload");
  if (scope === "admin") setAdminPosts(payload.posts);
  else setPublicPosts(payload.posts);
}

function refreshActivities(scope: ActivityScope) {
  if (scope === "admin") {
    if (!adminRequest) {
      adminRequest = fetchActivities("admin").finally(() => {
        adminRequest = null;
      });
    }
    return adminRequest;
  }

  if (!publicRequest) {
    publicRequest = fetchActivities("public").finally(() => {
      publicRequest = null;
    });
  }
  return publicRequest;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function useActivities(
  scope: ActivityScope = "admin",
  initialPosts?: ActivityPost[]
): ActivityPost[] {
  const initialSnapshot = useMemo(() => {
    if (!initialPosts) return null;
    return scope === "public" ? sortPublished(initialPosts) : initialPosts;
  }, [initialPosts, scope]);

  const getSnapshot = useCallback(() => {
    if (scope === "admin") return adminPosts;
    if (!publicLoaded && initialSnapshot) return initialSnapshot;
    return publicPosts;
  }, [initialSnapshot, scope]);

  const getServerSnapshot = useCallback(() => {
    if (initialSnapshot) return initialSnapshot;
    return scope === "admin" ? seedActivities : sortPublished(seedActivities);
  }, [initialSnapshot, scope]);

  const posts = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    if (scope === "public" && initialPosts?.length && !publicLoaded) {
      setPublicPosts(initialPosts);
      return;
    }

    if (scope === "admin" && adminLoaded) return;
    if (scope === "public" && publicLoaded) return;
    void refreshActivities(scope).catch(() => {
      // Keep the seed snapshot visible when the API is unavailable.
    });
  }, [initialPosts, scope]);

  return posts;
}

export function usePublishedActivities(
  initialPosts?: ActivityPost[]
): ActivityPost[] {
  return useActivities("public", initialPosts);
}

export function usePublishedActivity(slug: string): ActivityPost | undefined {
  const posts = usePublishedActivities();
  return useMemo(() => posts.find((post) => post.slug === slug), [posts, slug]);
}

export function isActivitySlugAvailable(
  slug: string,
  currentSlug?: string
): boolean {
  if (slug === currentSlug) return true;
  return !adminPosts.some((post) => post.slug === slug);
}

export async function saveActivity(
  post: ActivityPost,
  currentSlug?: string
): Promise<{ ok: true } | { ok: false; reason: "storage" }> {
  try {
    const response = await fetch("/api/admin/activities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post, currentSlug }),
    });
    if (!response.ok) return { ok: false, reason: "storage" };

    const payload = (await response.json()) as { posts?: ActivityPost[] };
    if (!Array.isArray(payload.posts)) return { ok: false, reason: "storage" };
    setAdminPosts(payload.posts);
    return { ok: true };
  } catch {
    return { ok: false, reason: "storage" };
  }
}

export async function deleteActivity(
  slug: string
): Promise<{ ok: true } | { ok: false; reason: "storage" }> {
  try {
    const response = await fetch(
      `/api/admin/activities?slug=${encodeURIComponent(slug)}`,
      { method: "DELETE" }
    );
    if (!response.ok) return { ok: false, reason: "storage" };

    const payload = (await response.json()) as { posts?: ActivityPost[] };
    if (!Array.isArray(payload.posts)) return { ok: false, reason: "storage" };
    setAdminPosts(payload.posts);
    return { ok: true };
  } catch {
    return { ok: false, reason: "storage" };
  }
}
