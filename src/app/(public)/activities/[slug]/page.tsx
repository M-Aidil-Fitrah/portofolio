import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ActivityDetailRoute } from "@/components/activities/ActivityDetailRoute";
import { getActivity, getPublishedActivities } from "@/lib/activities";
import { SITE_URL } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPublishedActivities().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getActivity(slug);
  if (!post) return {};

  return {
    title: post.title.en,
    description: post.caption.en,
    alternates: { canonical: `${SITE_URL}/activities/${post.slug}` },
    openGraph: {
      title: post.title.en,
      description: post.caption.en,
      url: `${SITE_URL}/activities/${post.slug}`,
      type: "article",
    },
  };
}

export default async function ActivityPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getActivity(slug);

  const jsonLd = post ? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title.en,
    description: post.caption.en,
    datePublished: post.date,
    author: { "@type": "Person", name: "Muhammad Aidil Fitrah" },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Header />
      <main id="main" className="flex-1 pb-24">
        <ActivityDetailRoute slug={slug} />
      </main>
      <Footer />
    </>
  );
}
