"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { LiveClock } from "@/components/ui/LiveClock";
import { SOCIAL } from "@/lib/site";
import { useSectionReveal } from "@/lib/useSectionReveal";

type Category = "general" | "internship" | "collaboration";
type Status = "idle" | "sending" | "success" | "error";

function AvailabilityGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ClockGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" />
    </svg>
  );
}

const CATEGORIES: Category[] = ["general", "internship", "collaboration"];

const fieldClassName =
  "w-full border-b border-hairline bg-transparent py-3 text-lg text-foreground placeholder:text-muted/70 transition-colors focus:border-volt focus:outline-none";

export function Contact() {
  const { t } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [message, setMessage] = useState("");
  // Honeypot: real visitors never see or fill this field (see the sr-only
  // wrapper below) — a filled value means a bot filled every field
  // indiscriminately, so the submit silently no-ops instead of erroring.
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useSectionReveal(sectionRef);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SOCIAL.email);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context) —
      // fall back to the plain mailto behavior instead of failing silently.
      window.location.href = `mailto:${SOCIAL.email}`;
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (company) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      });
      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
      setName("");
      setEmail("");
      setCategory("general");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      aria-labelledby="contact-heading"
      className="px-6 py-24 sm:px-10"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionSeam className="mb-14" />
        <SectionHeading index="05" label={t.contact.label} />

        <AnimatedText
          as="h2"
          id="contact-heading"
          type="chars"
          className="mt-6 text-[clamp(2.5rem,14vw,9rem)] font-semibold uppercase leading-[0.9] tracking-tight"
        >
          {t.contact.heading}
        </AnimatedText>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
          {t.contact.body}
        </p>

        <div className="mt-14 grid grid-cols-1 gap-8 border-t border-hairline pt-10 sm:grid-cols-2">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-volt">
              <AvailabilityGlyph className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-mono text-xs uppercase tracking-widest text-foreground">
                {t.contact.meta.availability.label}
              </span>
              <span className="mt-1 block text-sm text-muted">
                {t.contact.meta.availability.detail}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-volt">
              <ClockGlyph className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-mono text-xs uppercase tracking-widest text-foreground">
                {t.contact.meta.timezone.label}
              </span>
              <span className="mt-1 block font-mono text-sm tabular-nums text-muted">
                <LiveClock /> ({t.contact.meta.timezone.detail})
              </span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 border-t border-hairline pt-10">
          {/* Honeypot — visually and semantically hidden from real visitors
              and screen readers, but present in the DOM/tab order for bots
              that fill every field without checking visibility. */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <label
                htmlFor="contact-name"
                className="block font-mono text-xs uppercase tracking-widest text-muted"
              >
                {t.contact.form.name.label}
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder={t.contact.form.name.placeholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${fieldClassName} mt-3`}
              />
            </div>
            <div>
              <label
                htmlFor="contact-email"
                className="block font-mono text-xs uppercase tracking-widest text-muted"
              >
                {t.contact.form.email.label}
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t.contact.form.email.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${fieldClassName} mt-3`}
              />
            </div>
          </div>

          <div className="mt-8">
            <span className="block font-mono text-xs uppercase tracking-widest text-muted">
              {t.contact.form.category.label}
            </span>
            <div role="group" aria-label={t.contact.form.category.label} className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  aria-pressed={category === value}
                  className={`inline-flex h-10 items-center rounded-pill border px-5 font-mono text-xs uppercase tracking-widest transition-colors ${
                    category === value
                      ? "border-volt bg-volt text-ink"
                      : "btn-fill border-hairline text-foreground"
                  }`}
                >
                  {t.contact.form.category.options[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <label
              htmlFor="contact-message"
              className="block font-mono text-xs uppercase tracking-widest text-muted"
            >
              {t.contact.form.message.label}
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              rows={4}
              placeholder={t.contact.form.message.placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${fieldClassName} mt-3 resize-none`}
            />
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={status === "sending"}
              data-cursor={
                status === "sending" ? t.contact.form.sending : t.contact.form.submit
              }
              className="btn-fill inline-flex h-12 w-fit items-center justify-center rounded-pill border border-volt px-8 font-mono text-xs uppercase tracking-widest text-volt disabled:cursor-wait disabled:opacity-60"
            >
              {status === "sending" ? t.contact.form.sending : t.contact.form.submit}
            </button>

            <p aria-live="polite" className="font-mono text-xs uppercase tracking-widest">
              {status === "success" && (
                <span className="text-volt">{t.contact.form.success}</span>
              )}
              {status === "error" && (
                <span className="text-muted">{t.contact.form.error}</span>
              )}
            </p>
          </div>
        </form>

        <div className="mt-10 flex flex-col gap-2 border-t border-hairline pt-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.contact.form.orDirect}
          </p>
          <button
            type="button"
            onClick={copyEmail}
            data-cursor={copied ? t.contact.copied : t.contact.copyEmail}
            className="inline-block max-w-full break-words text-left text-lg font-medium text-foreground [overflow-wrap:anywhere] transition-colors hover:text-volt"
          >
            {SOCIAL.email}
          </button>
        </div>
      </div>
    </section>
  );
}
