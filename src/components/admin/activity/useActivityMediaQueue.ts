"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { MediaAsset } from "@/lib/activities";
import {
  deleteUploadedAsset,
  uploadActivityAsset,
} from "@/lib/api/asset-upload";
import {
  activityMediaFilesAreValid,
  activityMediaKind,
} from "./activity-admin-config";

const MAX_CONCURRENT_MEDIA_UPLOADS = 3;

interface QueueEntry {
  id: string;
  file: File;
  previewUrl: string;
  batchId: string;
  failed: boolean;
}

interface UploadBatch {
  total: number;
  completed: number;
  failed: number;
  toastId: string | number;
}

export interface ActivityMediaQueueStats {
  active: number;
  queued: number;
  failed: number;
}

const EMPTY_STATS: ActivityMediaQueueStats = {
  active: 0,
  queued: 0,
  failed: 0,
};

export function useActivityMediaQueue({
  onAppend,
  onPatch,
  onRemove,
}: {
  onAppend: (media: MediaAsset[]) => void;
  onPatch: (id: string, patch: Partial<MediaAsset>) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useLocale();
  const entriesRef = useRef(new Map<string, QueueEntry>());
  const batchesRef = useRef(new Map<string, UploadBatch>());
  const pendingRef = useRef<string[]>([]);
  const activeRef = useRef(new Set<string>());
  const cancelledRef = useRef(new Set<string>());
  const uploadedRef = useRef(new Set<string>());
  const mountedRef = useRef(true);
  const pumpRef = useRef<() => void>(() => {});
  const [stats, setStats] = useState(EMPTY_STATS);

  const syncStats = useCallback(() => {
    if (!mountedRef.current) return;
    setStats({
      active: activeRef.current.size,
      queued: pendingRef.current.length,
      failed: Array.from(entriesRef.current.values()).filter(
        (entry) => entry.failed
      ).length,
    });
  }, []);

  const completeBatch = useCallback(
    (batchId: string, succeeded: boolean) => {
      const batch = batchesRef.current.get(batchId);
      if (!batch) return;

      batch.completed += 1;
      if (!succeeded) batch.failed += 1;
      if (batch.completed < batch.total) {
        toast.loading(
          t.activities.admin.uploadProgress
            .replace("{completed}", String(batch.completed))
            .replace("{total}", String(batch.total)),
          { id: batch.toastId }
        );
        return;
      }

      if (batch.failed > 0) {
        toast.error(
          t.activities.admin.uploadFailed.replace(
            "{count}",
            String(batch.failed)
          ),
          { id: batch.toastId }
        );
      } else {
        toast.success(
          t.activities.admin.uploadComplete.replace(
            "{count}",
            String(batch.total)
          ),
          { id: batch.toastId }
        );
      }
      batchesRef.current.delete(batchId);
    },
    [t]
  );

  const processEntry = useCallback(
    async (entry: QueueEntry) => {
      let succeeded = false;
      onPatch(entry.id, { status: "uploading", error: undefined });

      try {
        const kind = activityMediaKind(entry.file);
        if (!kind) throw new Error("Unsupported media kind.");
        const uploaded = await uploadActivityAsset(
          entry.file,
          kind,
          (status) => onPatch(entry.id, { status }),
        );
        if (!mountedRef.current || cancelledRef.current.has(entry.id)) return;

        onPatch(entry.id, {
          id: uploaded.asset.id,
          src: uploaded.src,
          originalSrc: uploaded.src,
          poster: uploaded.posterSrc,
          width: uploaded.asset.width ?? undefined,
          height: uploaded.asset.height ?? undefined,
          duration:
            uploaded.asset.duration_ms === null ||
            uploaded.asset.duration_ms === undefined
              ? undefined
              : uploaded.asset.duration_ms / 1000,
          status: "ready",
          error: undefined,
        });
        uploadedRef.current.add(uploaded.asset.id);
        URL.revokeObjectURL(entry.previewUrl);
        entriesRef.current.delete(entry.id);
        succeeded = true;
      } catch {
        if (!mountedRef.current || cancelledRef.current.has(entry.id)) return;
        entry.failed = true;
        onPatch(entry.id, {
          status: "failed",
          error: t.activities.admin.uploadItemFailed,
        });
      } finally {
        activeRef.current.delete(entry.id);
        if (!cancelledRef.current.delete(entry.id)) {
          completeBatch(entry.batchId, succeeded);
        }
        syncStats();
        pumpRef.current();
      }
    },
    [completeBatch, onPatch, syncStats, t]
  );

  const pump = useCallback(() => {
    while (
      activeRef.current.size < MAX_CONCURRENT_MEDIA_UPLOADS &&
      pendingRef.current.length > 0
    ) {
      const id = pendingRef.current.shift();
      if (!id) break;
      const entry = entriesRef.current.get(id);
      if (!entry || cancelledRef.current.has(id)) continue;

      activeRef.current.add(id);
      void processEntry(entry);
    }
    syncStats();
  }, [processEntry, syncStats]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const enqueue = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const selected = Array.from(files);
      const valid = selected.filter((file) =>
        activityMediaFilesAreValid([file])
      );
      const invalidCount = selected.length - valid.length;

      if (invalidCount > 0) {
        toast.error(
          t.activities.admin.invalidFiles.replace(
            "{count}",
            String(invalidCount)
          )
        );
      }
      if (valid.length === 0) return;

      const batchId = crypto.randomUUID();
      const toastId = toast.loading(
        t.activities.admin.uploadingFiles.replace(
          "{count}",
          String(valid.length)
        )
      );
      batchesRef.current.set(batchId, {
        total: valid.length,
        completed: 0,
        failed: 0,
        toastId,
      });

      const queuedMedia = valid.map((file): MediaAsset => {
        const id = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);
        entriesRef.current.set(id, {
          id,
          file,
          previewUrl,
          batchId,
          failed: false,
        });
        pendingRef.current.push(id);

        return {
          id,
          type: activityMediaKind(file) === "video" ? "video" : "image",
          src: previewUrl,
          alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
          caption: { en: "", id: "" },
          status: "queued",
        };
      });

      onAppend(queuedMedia);
      syncStats();
      queueMicrotask(() => pumpRef.current());
    },
    [onAppend, syncStats, t]
  );

  const retry = useCallback(
    (id: string | undefined) => {
      if (!id) return;
      const entry = entriesRef.current.get(id);
      if (!entry) {
        toast.error(t.activities.admin.retryUnavailable);
        return;
      }

      const batchId = crypto.randomUUID();
      entry.batchId = batchId;
      entry.failed = false;
      batchesRef.current.set(batchId, {
        total: 1,
        completed: 0,
        failed: 0,
        toastId: toast.loading(t.activities.admin.retryingUpload),
      });
      pendingRef.current.push(id);
      onPatch(id, { status: "queued", error: undefined });
      syncStats();
      queueMicrotask(() => pumpRef.current());
    },
    [onPatch, syncStats, t]
  );

  const remove = useCallback(
    (id: string | undefined) => {
      if (!id) return;
      const entry = entriesRef.current.get(id);
      if (entry) {
        const wasActive = activeRef.current.has(id);
        if (wasActive) {
          cancelledRef.current.add(id);
        }
        pendingRef.current = pendingRef.current.filter(
          (pendingId) => pendingId !== id
        );
        URL.revokeObjectURL(entry.previewUrl);
        entriesRef.current.delete(id);
        completeBatch(entry.batchId, false);
        if (!wasActive) {
          cancelledRef.current.delete(id);
        }
      } else if (uploadedRef.current.delete(id)) {
        void deleteUploadedAsset(id).catch(() => undefined);
      }
      onRemove(id);
      syncStats();
      queueMicrotask(() => pumpRef.current());
    },
    [completeBatch, onRemove, syncStats]
  );

  useEffect(() => {
    mountedRef.current = true;
    const entries = entriesRef.current;
    const batches = batchesRef.current;
    const active = activeRef.current;
    const cancelled = cancelledRef.current;
    const uploaded = uploadedRef.current;

    return () => {
      mountedRef.current = false;
      entries.forEach((entry) => {
        URL.revokeObjectURL(entry.previewUrl);
      });
      batches.forEach((batch) => toast.dismiss(batch.toastId));
      entries.clear();
      batches.clear();
      pendingRef.current = [];
      active.clear();
      cancelled.clear();
      uploaded.clear();
    };
  }, []);

  return { enqueue, retry, remove, stats };
}
