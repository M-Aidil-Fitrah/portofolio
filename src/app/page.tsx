"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { LangToggle } from "@/components/ui/LangToggle";

export default function Home() {
  const { t } = useLocale();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <LangToggle />
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
        {t.hero.eyebrow}
      </p>
      <h1 className="text-4xl font-semibold uppercase tracking-tight sm:text-6xl">
        {t.hero.lines.join(" ")}
      </h1>
      <p className="font-accent text-2xl italic text-muted">
        {t.hero.subline.pre}
        {t.hero.subline.italic}
        {t.hero.subline.post}
      </p>
    </main>
  );
}
