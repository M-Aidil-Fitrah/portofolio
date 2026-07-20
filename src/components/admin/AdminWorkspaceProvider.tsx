"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { AdminConfirmDialog } from "./AdminConfirmDialog";

interface AdminWorkspaceContextValue {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  confirmDiscard: () => Promise<boolean>;
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(
  null
);

export function AdminWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const [dirty, setDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    []
  );

  const confirmDiscard = useCallback(() => {
    if (!dirty) return Promise.resolve(true);
    if (resolverRef.current) return Promise.resolve(false);

    setDialogOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [dirty]);

  const settle = useCallback((confirmed: boolean) => {
    setDialogOpen(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(confirmed);
  }, []);

  const value = useMemo(
    () => ({ dirty, setDirty, confirmDiscard }),
    [confirmDiscard, dirty]
  );

  return (
    <AdminWorkspaceContext.Provider value={value}>
      {children}
      <AdminConfirmDialog
        open={dialogOpen}
        title={t.admin.unsaved.title}
        body={t.admin.unsaved.body}
        cancelLabel={t.admin.unsaved.stay}
        confirmLabel={t.admin.unsaved.discard}
        danger
        onCancel={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    </AdminWorkspaceContext.Provider>
  );
}

export function useAdminWorkspace() {
  const context = useContext(AdminWorkspaceContext);
  if (!context) {
    throw new Error("useAdminWorkspace must be used within AdminWorkspaceProvider");
  }
  return context;
}
