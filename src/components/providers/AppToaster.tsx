"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      visibleToasts={4}
      gap={8}
      duration={3600}
      closeButton
      richColors={false}
      offset={24}
      mobileOffset={16}
      containerAriaLabel="Notifications"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group flex w-[min(380px,calc(100vw-2rem))] items-start gap-3 border border-hairline bg-ink/95 px-4 py-3 text-foreground shadow-2xl shadow-black/35 backdrop-blur-md",
          content: "min-w-0 flex-1",
          title:
            "font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em]",
          description: "mt-1 text-xs leading-relaxed text-muted",
          icon: "mt-0.5 text-volt",
          closeButton:
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hairline bg-ink text-muted transition-colors hover:border-volt hover:text-volt",
          success: "border-l-2 border-l-volt",
          error: "border-l-2 border-l-foreground",
          warning: "border-l-2 border-l-muted",
          loading: "border-l-2 border-l-volt/60",
          actionButton:
            "rounded-pill border border-volt px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-volt",
        },
      }}
      icons={{
        success: <ToastGlyph variant="success" />,
        error: <ToastGlyph variant="error" />,
        warning: <ToastGlyph variant="warning" />,
        info: <ToastGlyph variant="info" />,
        loading: <ToastGlyph variant="loading" />,
      }}
    />
  );
}

function ToastGlyph({
  variant,
}: {
  variant: "success" | "error" | "warning" | "info" | "loading";
}) {
  if (variant === "loading") {
    return (
      <span
        className="block h-2.5 w-2.5 animate-pulse rounded-full bg-volt"
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {variant === "success" && <path d="m3 8 3 3 7-7" />}
      {variant === "error" && (
        <>
          <path d="m4 4 8 8M12 4 4 12" />
          <circle cx="8" cy="8" r="6.25" />
        </>
      )}
      {variant === "warning" && (
        <>
          <path d="M8 2.5 14 13H2Z" />
          <path d="M8 6v3.5M8 11.5h.01" />
        </>
      )}
      {variant === "info" && (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 7v4M8 4.75h.01" />
        </>
      )}
    </svg>
  );
}
