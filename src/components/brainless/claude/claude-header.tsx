import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ClaudeHeader — a terminal-style welcome box.
 *
 * The title-in-the-border is a real <fieldset>/<legend>, so it stays semantic
 * and inherits whatever background it sits on. The mark below is a custom SVG
 * for this portfolio, kept blocky so it still belongs inside the CLI surface.
 */
const ROSE = "#cd694a";
const GRAY = "#949494";

export function AidilMark({
  scale = 1,
  color = ROSE,
  faceColor = "var(--color-surface)",
  className,
}: {
  scale?: number;
  color?: string;
  faceColor?: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      width={96 * scale}
      height={72 * scale}
      viewBox="0 0 96 72"
      fill="none"
      className={className}
    >
      <path
        fill={color}
        d="M17 37C17 19.6 32.1 8 53.6 8C75.4 8 91 20.1 91 37.4C91 54.8 75.6 66 54.2 66C44.7 66 36.2 63.8 29.8 59.8L17.8 64.6L21.7 53.1C18.6 48.6 17 43.2 17 37Z"
      />
      <path
        fill={color}
        d="M9 26.7C9 21.5 12 17.4 16.3 16.2V28.2C13.6 30.4 12.2 33.7 12.2 37.7C12.2 41.7 13.6 45 16.3 47.2V59.1C9.4 57.4 4.8 49.2 4.8 38.9C4.8 34.1 6.3 29.6 9 26.7Z"
      />
      <path
        fill={color}
        d="M80 16.2C84.4 17.4 87.5 21.5 87.5 26.7C90.1 29.6 91.6 34.1 91.6 38.9C91.6 49.2 87 57.4 80 59.1V47.2C82.7 45 84 41.7 84 37.7C84 33.7 82.7 30.4 80 28.2V16.2Z"
      />
      <path
        fill={color}
        d="M10.2 13.5C10.2 11.7 11.6 10.3 13.4 10.3C15.1 10.3 16.5 11.7 16.5 13.5V28.7H10.2V13.5Z"
      />
      <path
        fill={color}
        d="M80.2 13.5C80.2 11.7 81.6 10.3 83.4 10.3C85.1 10.3 86.5 11.7 86.5 13.5V28.7H80.2V13.5Z"
      />
      <rect
        width="50"
        height="26"
        x="29"
        y="25"
        fill={faceColor}
        rx="10"
      />
      <path
        stroke={color}
        strokeLinecap="round"
        strokeWidth="5"
        d="M39 36.5C41.8 33.3 46.4 33.3 49 36.5"
      />
      <path
        stroke={color}
        strokeLinecap="round"
        strokeWidth="5"
        d="M59 36.5C61.8 33.3 66.4 33.3 69 36.5"
      />
      <path
        stroke={color}
        strokeLinecap="round"
        strokeWidth="4"
        d="M51.5 43.5C54.3 47.1 58.7 47.1 61.5 43.5"
      />
    </svg>
  );
}

export function ClaudeHeader({
  title = "Claude Code",
  version = "v2.1.206",
  user = "Ben",
  greeting,
  model = "Fable 5 with xhigh effort · Claude Max",
  org = "ben@freestyle.sh's Organization",
  cwd = "~/dev/brainless",
  tips = ["Ask Claude to create a new app or clone a repo"],
  whatsNew = [
    "Added directory path suggestions to /cd",
    "Added a /doctor check that proposes trims",
  ],
  tipsLabel = "Tips for getting started",
  whatsNewLabel = "What's new",
  footerText = "/release-notes for more",
  accentColor = ROSE,
  mutedColor = GRAY,
  foregroundColor = "#c0caf5",
  className,
}: {
  title?: string;
  version?: string;
  user?: string;
  greeting?: string;
  model?: string;
  org?: string;
  cwd?: string;
  tips?: string[];
  whatsNew?: string[];
  tipsLabel?: string;
  whatsNewLabel?: string;
  footerText?: string;
  accentColor?: string;
  mutedColor?: string;
  foregroundColor?: string;
  className?: string;
}) {
  return (
    <fieldset
      className={cn(
        "min-w-0 rounded-none border px-3 pb-3.5 pt-1 font-mono text-[13px] leading-[1.5] sm:px-4",
        className,
      )}
      style={{ borderColor: accentColor, color: foregroundColor }}
    >
      <legend className="max-w-full truncate px-2" style={{ color: accentColor }}>
        {title} <span style={{ color: mutedColor }}>{version}</span>
      </legend>

      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.1fr)]">
        {/* left: identity */}
        <div className="flex min-w-0 flex-col items-center gap-2 py-1 text-center">
          <div className="font-semibold">{greeting ?? `Welcome back ${user}!`}</div>
          <AidilMark color={accentColor} className="my-1.5 h-14 w-auto" />
          <div className="min-w-0 space-y-0.5 break-words" style={{ color: mutedColor }}>
            <div>{model}</div>
            <div>{org}</div>
            <div>{cwd}</div>
          </div>
        </div>

        <div
          aria-hidden
          className="hidden opacity-35 sm:block"
          style={{ background: accentColor }}
        />

        {/* right: tips + what's new */}
        <div className="min-w-0 space-y-1">
          <div className="font-semibold" style={{ color: accentColor }}>
            {tipsLabel}
          </div>
          {tips.map((t) => (
            <div key={t} className="break-words">
              {t}
            </div>
          ))}
          <div className="my-1.5 h-px" style={{ background: accentColor }} />
          <div className="font-semibold" style={{ color: accentColor }}>
            {whatsNewLabel}
          </div>
          {whatsNew.map((t) => (
            <div key={t} className="break-words">
              {t}
            </div>
          ))}
          <div className="break-words italic" style={{ color: mutedColor }}>
            {footerText}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
