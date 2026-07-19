"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ActivityComment } from "@/lib/activities";

const COMMENTS_KEY = "activity-comments";
const HIDDEN_KEY = "activity-comments-hidden-v1";
const CHANGE_EVENT = "activity-comments-change";

export interface ActivityCommentStoreSnapshot {
  extra: Record<string, ActivityComment[]>;
  hiddenIds: string[];
}

const EMPTY_SNAPSHOT: ActivityCommentStoreSnapshot = { extra: {}, hiddenIds: [] };

let cache: {
  commentsRaw: string | null | undefined;
  hiddenRaw: string | null | undefined;
  snapshot: ActivityCommentStoreSnapshot;
} = {
  commentsRaw: undefined,
  hiddenRaw: undefined,
  snapshot: EMPTY_SNAPSHOT,
};

function parseRecord(raw: string | null): Record<string, ActivityComment[]> {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function parseHidden(raw: string | null): string[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getClientSnapshot(): ActivityCommentStoreSnapshot {
  const commentsRaw = window.localStorage.getItem(COMMENTS_KEY);
  const hiddenRaw = window.localStorage.getItem(HIDDEN_KEY);
  if (cache.commentsRaw !== commentsRaw || cache.hiddenRaw !== hiddenRaw) {
    cache = {
      commentsRaw,
      hiddenRaw,
      snapshot: {
        extra: parseRecord(commentsRaw),
        hiddenIds: parseHidden(hiddenRaw),
      },
    };
  }
  return cache.snapshot;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function publishChange() {
  cache.commentsRaw = undefined;
  cache.hiddenRaw = undefined;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useActivityCommentStore(): ActivityCommentStoreSnapshot {
  return useSyncExternalStore(subscribe, getClientSnapshot, () => EMPTY_SNAPSHOT);
}

export function useVisibleActivityComments(slug: string, seed: ActivityComment[]) {
  const store = useActivityCommentStore();
  return useMemo(() => {
    const hidden = new Set(store.hiddenIds);
    return [...seed, ...(store.extra[slug] ?? [])].filter(
      (comment) => !hidden.has(comment.id)
    );
  }, [seed, slug, store]);
}

export function addActivityComment(slug: string, comment: ActivityComment) {
  const current = getClientSnapshot();
  const next = {
    ...current.extra,
    [slug]: [...(current.extra[slug] ?? []), comment],
  };
  window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(next));
  publishChange();
}

export function setActivityCommentHidden(commentId: string, hidden: boolean) {
  const current = getClientSnapshot();
  const ids = new Set(current.hiddenIds);
  if (hidden) ids.add(commentId);
  else ids.delete(commentId);
  window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(ids)));
  publishChange();
}

