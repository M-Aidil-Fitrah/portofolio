"use client";

import { usePathname } from "next/navigation";
import { ActivityDetail } from "@/components/activities/ActivityDetail";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityPost } from "@/lib/activities";

export function ActivityDetailRoute({
  initialPost,
}: {
  slug: string;
  initialPost?: ActivityPost;
}) {
  const post = initialPost;
  const pathname = usePathname();
  const { t } = useLocale();

  if (post) return <ActivityDetail post={post} />;

  const base = pathname.startsWith("/en") ? "/en" : "";
  return (
    <section className="mx-auto flex min-h-[70svh] max-w-[1100px] flex-col justify-center px-6 pt-24 sm:px-10">
      <p className="font-mono text-xs uppercase tracking-widest text-volt">
        {t.notFound.code}
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold uppercase leading-tight sm:text-6xl">
        {t.notFound.heading}
      </h1>
      <p className="mt-5 max-w-xl leading-relaxed text-muted">{t.notFound.body}</p>
      <TransitionLink
        href={`${base}/activities`}
        label={t.activities.back}
        className="btn-fill mt-8 inline-flex h-11 w-fit items-center rounded-pill border border-volt px-6 font-mono text-xs uppercase tracking-widest text-volt"
      >
        {t.activities.back}
      </TransitionLink>
    </section>
  );
}
