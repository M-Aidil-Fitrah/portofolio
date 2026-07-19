"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  activities as seedActivities,
  type ActivityPost,
} from "@/lib/activities";

const STORAGE_KEY = "portfolio-activity-overrides-v1";
const CHANGE_EVENT = "portfolio-activities-change";

interface StoredActivityState {
  version: 1;
  overrides: Record<string, ActivityPost>;
}

const EMPTY_STATE: StoredActivityState = { version: 1, overrides: {} };

let cache: {
  raw: string | null | undefined;
  state: StoredActivityState;
  posts: ActivityPost[];
} = {
  raw: undefined,
  state: EMPTY_STATE,
  posts: seedActivities,
};

function parseState(raw: string | null): StoredActivityState {
  if (!raw) return EMPTY_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredActivityState>;
    if (parsed.version === 1 && parsed.overrides) {
      return { version: 1, overrides: parsed.overrides };
    }
  } catch {
    // A corrupt browser mock should fall back to the checked-in seed data.
  }

  return EMPTY_STATE;
}

function mergePosts(state: StoredActivityState): ActivityPost[] {
  const merged = new Map(seedActivities.map((post) => [post.slug, post]));
  Object.values(state.overrides).forEach((post) => merged.set(post.slug, post));
  return Array.from(merged.values());
}

function getClientSnapshot(): ActivityPost[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (cache.raw !== raw) {
    const state = parseState(raw);
    cache = { raw, state, posts: mergePosts(state) };
  }
  return cache.posts;
}

function getServerSnapshot(): ActivityPost[] {
  return seedActivities;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readState(): StoredActivityState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return parseState(raw);
}

function publishChange() {
  cache.raw = undefined;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveActivity(post: ActivityPost): { ok: true } | { ok: false; reason: "storage" } {
  try {
    const current = readState();
    const next: StoredActivityState = {
      version: 1,
      overrides: { ...current.overrides, [post.slug]: post },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    publishChange();
    return { ok: true };
  } catch {
    return { ok: false, reason: "storage" };
  }
}

export function useActivities(): ActivityPost[] {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

export function usePublishedActivities(): ActivityPost[] {
  const posts = useActivities();
  return useMemo(
    () =>
      posts
        .filter((post) => post.status === "published")
        .sort((a, b) => {
          if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
          return b.date.localeCompare(a.date);
        }),
    [posts]
  );
}

export function usePublishedActivity(slug: string): ActivityPost | undefined {
  const posts = usePublishedActivities();
  return useMemo(() => posts.find((post) => post.slug === slug), [posts, slug]);
}

export function isActivitySlugAvailable(slug: string, currentSlug?: string): boolean {
  if (slug === currentSlug) return true;
  return !getClientSnapshot().some((post) => post.slug === slug);
}

