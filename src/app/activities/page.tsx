import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ActivitiesHero } from "@/components/activities/ActivitiesHero";
import { ActivityFeed } from "@/components/activities/ActivityFeed";
import { SITE_URL } from "@/lib/site";
import en from "@/lib/i18n/en";

export const metadata: Metadata = {
  title: en.activities.label,
  description: en.activities.intro,
  alternates: { canonical: `${SITE_URL}/activities` },
  openGraph: {
    title: en.activities.label,
    description: en.activities.intro,
    url: `${SITE_URL}/activities`,
    type: "website",
  },
};

export default function ActivitiesPage() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1 px-6 pb-24 sm:px-10">
        <div className="mx-auto max-w-[1100px]">
          <ActivitiesHero />
          <div className="mt-14">
            <ActivityFeed />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
