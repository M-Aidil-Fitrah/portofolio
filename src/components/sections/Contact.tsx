"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ClaudeHeader } from "@/components/brainless/claude/claude-header";
import { useLocale } from "@/components/providers/LocaleProvider";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { LiveClock } from "@/components/ui/LiveClock";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { SOCIAL } from "@/lib/site";
import { useSectionReveal } from "@/lib/useSectionReveal";

type Category = "general" | "internship" | "collaboration";
type Status = "idle" | "sending" | "success" | "error";

const CATEGORIES: Category[] = ["general", "internship", "collaboration"];

const terminalInputClassName =
  "mt-2 w-full border-0 bg-transparent p-0 font-mono text-[15px] leading-7 text-foreground outline-none placeholder:text-muted/65";

export function Contact() {
  const { t } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useSectionReveal(sectionRef);

  useEffect(
    () => () => {
      window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SOCIAL.email);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${SOCIAL.email}`;
    }
  };

  const resetStatus = () => {
    if (status !== "idle") setStatus("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (company) return;

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message, company }),
      });
      if (!response.ok) throw new Error("Request failed");

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
      className="px-6 py-24 sm:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionSeam className="mb-14" />
        <SectionHeading index="05" label={t.contact.label} />

        <div className="mt-10 grid items-start gap-14 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)] lg:gap-16 xl:gap-24">
          <div className="lg:sticky lg:top-28">
            <AnimatedText
              as="h2"
              id="contact-heading"
              type="lines"
              className="max-w-[7ch] text-[clamp(3rem,7vw,7rem)] font-semibold uppercase leading-[0.88] tracking-tight"
            >
              {t.contact.heading}
            </AnimatedText>

            <p className="mt-7 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              {t.contact.body}
            </p>

            <dl className="mt-10 border-y border-hairline font-mono text-xs">
              <div className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-hairline py-4">
                <dt className="uppercase tracking-widest text-muted">
                  {t.contact.meta.availability.label}
                </dt>
                <dd className="text-foreground">
                  <span
                    aria-hidden="true"
                    className="mr-2 inline-block h-2 w-2 bg-volt"
                  />
                  {t.contact.meta.availability.detail}
                </dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-4">
                <dt className="uppercase tracking-widest text-muted">
                  {t.contact.meta.timezone.label}
                </dt>
                <dd className="tabular-nums text-foreground">
                  <LiveClock /> / {t.contact.meta.timezone.detail}
                </dd>
              </div>
            </dl>
          </div>

          <div className="min-w-0">
            <ClaudeHeader
              title={t.contact.terminal.title}
              version={t.contact.terminal.version}
              greeting={t.contact.terminal.greeting}
              model={t.contact.terminal.role}
              org={t.contact.meta.availability.detail}
              cwd="~/portfolio/contact"
              tipsLabel={t.contact.terminal.tipsLabel}
              tips={t.contact.terminal.tips}
              whatsNewLabel={t.contact.terminal.statusLabel}
              whatsNew={t.contact.terminal.status}
              footerText={t.contact.terminal.footer}
              accentColor="var(--color-volt)"
              mutedColor="var(--color-muted)"
              foregroundColor="var(--color-foreground)"
              className="bg-surface px-4 pb-5 pt-2 sm:px-5"
            />

            <form
              onSubmit={handleSubmit}
              aria-label={t.contact.form.ariaLabel}
              className="-mt-px border border-hairline bg-surface font-mono"
            >
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 px-4 py-3 text-[11px] uppercase tracking-widest text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span className="text-volt">{t.contact.terminal.command}</span>
                <span>{t.contact.terminal.secure}</span>
              </div>

              <div className="grid gap-2 border-t border-hairline px-4 py-5 sm:px-5 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-5">
                <label
                  htmlFor="contact-name"
                  className="text-xs leading-7 text-muted"
                >
                  <span aria-hidden="true" className="mr-2 text-volt">
                    01
                  </span>
                  {t.contact.form.name.label}
                </label>
                <div className="flex min-w-0 items-start gap-3 border-b border-hairline pb-2 focus-within:border-volt">
                  <span aria-hidden="true" className="mt-2 text-volt">
                    ❯
                  </span>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    maxLength={120}
                    autoComplete="name"
                    placeholder={t.contact.form.name.placeholder}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      resetStatus();
                    }}
                    className={terminalInputClassName}
                  />
                </div>
              </div>

              <div className="grid gap-2 border-t border-hairline px-4 py-5 sm:px-5 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-5">
                <label
                  htmlFor="contact-email"
                  className="text-xs leading-7 text-muted"
                >
                  <span aria-hidden="true" className="mr-2 text-volt">
                    02
                  </span>
                  {t.contact.form.email.label}
                </label>
                <div className="flex min-w-0 items-start gap-3 border-b border-hairline pb-2 focus-within:border-volt">
                  <span aria-hidden="true" className="mt-2 text-volt">
                    ❯
                  </span>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    inputMode="email"
                    placeholder={t.contact.form.email.placeholder}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      resetStatus();
                    }}
                    className={terminalInputClassName}
                  />
                </div>
              </div>

              <fieldset className="grid gap-3 border-t border-hairline px-4 py-5 sm:px-5 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-5">
                <legend className="sr-only">{t.contact.form.category.label}</legend>
                <div aria-hidden="true" className="text-xs leading-7 text-muted">
                  <span className="mr-2 text-volt">03</span>
                  {t.contact.form.category.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((value) => (
                    <label key={value} className="relative">
                      <input
                        type="radio"
                        name="category"
                        value={value}
                        checked={category === value}
                        onChange={() => {
                          setCategory(value);
                          resetStatus();
                        }}
                        className="peer sr-only"
                      />
                      <span className="inline-flex min-h-9 items-center border border-hairline px-3 text-xs text-muted transition-colors hover:border-muted hover:text-foreground peer-checked:border-volt peer-checked:bg-volt peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-volt">
                        {category === value ? "●" : "○"}
                        <span className="ml-2">
                          {t.contact.form.category.options[value]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-2 border-t border-hairline px-4 py-5 sm:px-5 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-5">
                <label
                  htmlFor="contact-message"
                  className="text-xs leading-7 text-muted"
                >
                  <span aria-hidden="true" className="mr-2 text-volt">
                    04
                  </span>
                  {t.contact.form.message.label}
                </label>
                <div className="flex min-w-0 items-start gap-3 border-b border-hairline pb-2 focus-within:border-volt">
                  <span aria-hidden="true" className="mt-2 text-volt">
                    ❯
                  </span>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    maxLength={5000}
                    rows={4}
                    placeholder={t.contact.form.message.placeholder}
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      resetStatus();
                    }}
                    className={`${terminalInputClassName} resize-none`}
                  />
                </div>
              </div>

              <div className="border-t border-hairline px-4 py-5 sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    role="status"
                    aria-live="polite"
                    className="max-w-md text-xs leading-5 text-muted"
                  >
                    {status === "idle" && t.contact.form.privacy}
                    {status === "sending" && t.contact.form.sending}
                    {status === "success" && (
                      <span className="text-volt">{t.contact.form.success}</span>
                    )}
                    {status === "error" && t.contact.form.error}
                  </p>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    data-cursor={
                      status === "sending" ? t.contact.form.sending : t.contact.form.submit
                    }
                    className="btn-fill inline-flex min-h-11 shrink-0 items-center justify-center rounded-pill border border-volt px-6 text-xs uppercase tracking-widest text-volt disabled:cursor-wait disabled:opacity-60"
                  >
                    <span aria-hidden="true" className="mr-2">
                      &gt;_
                    </span>
                    {status === "sending" ? t.contact.form.sending : t.contact.form.submit}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-hairline px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span className="text-muted">{t.contact.form.orDirect}</span>
                <div className="flex min-w-0 items-center gap-3">
                  <a
                    href={`mailto:${SOCIAL.email}`}
                    className="min-w-0 truncate text-foreground transition-colors hover:text-volt"
                  >
                    {SOCIAL.email}
                  </a>
                  <button
                    type="button"
                    onClick={copyEmail}
                    data-cursor={copied ? t.contact.copied : t.contact.copyEmail}
                    className="shrink-0 uppercase tracking-widest text-volt transition-colors hover:text-foreground"
                  >
                    {copied ? t.contact.copied : t.contact.copyEmail}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
