"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LangToggle } from "@/components/ui/LangToggle";
import { Logomark } from "@/components/ui/Logomark";

type AdminLoginProps = {
  nextPath: string;
};

const inputClass =
  "h-12 w-full border border-hairline bg-transparent px-4 text-sm text-foreground placeholder:text-muted focus:border-volt focus:outline-none";

export function AdminLogin({ nextPath }: AdminLoginProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(
          response.status === 401
            ? t.admin.login.invalid
            : response.status === 429
              ? t.admin.login.rateLimited
              : t.admin.login.unavailable
        );
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(t.admin.login.unavailable);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main id="main" className="relative flex min-h-screen flex-col px-6 sm:px-10">
      <header className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between border-b border-hairline">
        <Link
          href="/"
          aria-label={t.admin.login.backHome}
          className="flex items-center gap-3 text-foreground transition-colors hover:text-volt"
        >
          <Logomark className="h-7 w-6" />
          <span className="font-mono text-[11px] uppercase tracking-widest">
            AF / Admin
          </span>
        </Link>
        <LangToggle />
      </header>

      <div className="mx-auto grid w-full max-w-[1100px] flex-1 items-center py-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-24">
        <section className="max-w-xl pb-14 lg:pb-0">
          <p className="font-mono text-xs uppercase tracking-widest text-volt">
            {t.admin.login.eyebrow}
          </p>
          <h1 className="mt-4 text-5xl font-semibold uppercase leading-[0.92] sm:text-7xl">
            {t.admin.login.heading}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            {t.admin.login.intro}
          </p>
        </section>

        <section className="border-t border-hairline pt-10 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0">
          <form onSubmit={submit} className="space-y-6">
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-muted">
                {t.admin.login.email}
              </span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-muted">
                {t.admin.login.password}
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className={`${inputClass} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword
                      ? t.admin.login.hidePassword
                      : t.admin.login.showPassword
                  }
                  title={
                    showPassword
                      ? t.admin.login.hidePassword
                      : t.admin.login.showPassword
                  }
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </span>
            </label>

            <div aria-live="polite" className="min-h-5">
              {error && <p className="text-sm text-foreground">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-fill flex h-12 w-full items-center justify-center rounded-pill border border-volt px-6 font-mono text-xs uppercase tracking-widest text-volt disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? t.admin.login.signingIn : t.admin.login.submit}
            </button>
          </form>
        </section>
      </div>

      <footer className="mx-auto flex w-full max-w-[1400px] items-center justify-between border-t border-hairline py-6 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span>{t.admin.login.privateAccess}</span>
        <Link href="/" className="transition-colors hover:text-volt">
          {t.admin.login.backHome} &rarr;
        </Link>
      </footer>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="m3 3 18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.2 2.9M6.5 6.7C3.9 8.5 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
