"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Whole percent of bytes transferred, keyed by the uploading item's id. */
export type UploadProgressMap = Record<string, number>;

const EMPTY_PROGRESS: UploadProgressMap = {};

/**
 * Collects byte-level progress for several concurrent uploads and publishes at
 * most one state update per frame. Without the batching a fast transfer would
 * re-render the whole editor once per packet, and three of them at once would
 * do it three times over.
 */
export function useUploadProgress() {
  const [progress, setProgress] = useState<UploadProgressMap>(EMPTY_PROGRESS);
  const pendingRef = useRef(new Map<string, number | null>());
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const flush = useCallback(() => {
    frameRef.current = null;
    const pending = pendingRef.current;
    if (pending.size === 0 || !mountedRef.current) {
      pending.clear();
      return;
    }
    setProgress((current) => {
      let next = current;
      pending.forEach((percent, id) => {
        if (percent === null) {
          if (!(id in next)) return;
          if (next === current) next = { ...current };
          delete next[id];
          return;
        }
        if (next[id] === percent) return;
        if (next === current) next = { ...current };
        next[id] = percent;
      });
      return next;
    });
    pending.clear();
  }, []);

  const setEntryProgress = useCallback(
    (id: string, percent: number | null) => {
      if (!id || !mountedRef.current) return;
      pendingRef.current.set(id, percent);
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(flush);
    },
    [flush]
  );

  useEffect(() => {
    mountedRef.current = true;
    const pending = pendingRef.current;
    return () => {
      mountedRef.current = false;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      pending.clear();
    };
  }, []);

  return { progress, setEntryProgress };
}
