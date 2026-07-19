"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import en from "@/lib/i18n/en";
import id from "@/lib/i18n/id";
import type { Dictionary, Locale } from "@/lib/i18n/types";

const dictionaries: Record<Locale, Dictionary> = { en, id };

const STORAGE_KEY = "locale";
const listeners = new Set<() => void>();

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "id";
}

/** Server always renders English — the client snapshot only takes over
 * post-hydration, so there is never a mismatch (see useSyncExternalStore). */
function getServerSnapshot(): Locale {
  return "en";
}

function getSnapshot(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : "en";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function writeLocale(next: Locale) {
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const storedLocale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const pathname = usePathname();
  const router = useRouter();

  // /en/* is the explicit always-English mirror (see app/en) — on it the
  // stored preference is ignored rather than overwritten, so a visitor's
  // ID choice on the root site survives a shared /en link. Indonesian has
  // no URL of its own by design: switching to ID from /en routes back to
  // the root equivalent, where ID is a client-side enhancement.
  const onEnRoute = pathname === "/en" || pathname.startsWith("/en/");
  const locale: Locale = onEnRoute ? "en" : storedLocale;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      writeLocale(next);
      if (onEnRoute && next === "id") {
        router.push(pathname.slice("/en".length) || "/");
      }
    },
    [onEnRoute, pathname, router]
  );
  const toggleLocale = useCallback(
    () => setLocale(locale === "en" ? "id" : "en"),
    [locale, setLocale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: dictionaries[locale], setLocale, toggleLocale }),
    [locale, setLocale, toggleLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
