"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "activity-likes";
const CHANGE_EVENT = "activity-likes-change";

function readLikes(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
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
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useActivityLiked(slug: string) {
  return useSyncExternalStore(
    subscribe,
    () => Boolean(readLikes()[slug]),
    () => false
  );
}

export function toggleActivityLike(slug: string) {
  const all = readLikes();
  all[slug] = !all[slug];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  publishChange();
  return all[slug];
}

export function deleteActivityLike(slug: string) {
  try {
    const all = readLikes();
    delete all[slug];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    publishChange();
  } catch {
    // Engagement cleanup is best effort in mock storage.
  }
}
