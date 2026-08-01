import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ActivityDetailRoute } from "@/components/activities/ActivityDetailRoute";
import { SITE_URL } from "@/lib/site";
import {
  getApiPublishedActivities,
  getApiPublishedActivity,
} from "@/lib/api/activity-api";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getApiPublishedActivity(slug).catch(() => null);
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
  // Prefetched on the server so the related rail arrives with the HTML.
  const [publishedPost, publishedPosts] = await Promise.all([
    getApiPublishedActivity(slug).catch(() => null),
    getApiPublishedActivities().catch(() => []),
  ]);

  // A retired slug still resolves; send readers to the canonical URL.
  if (publishedPost?.slug && publishedPost.slug !== slug) {
    permanentRedirect(`/activities/${publishedPost.slug}`);
  }

  const jsonLd = publishedPost
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: publishedPost.title.en,
        description: publishedPost.caption.en,
        datePublished: publishedPost.date,
        author: { "@type": "Person", name: "Muhammad Aidil Fitrah" },
      }
    : null;

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
        <ActivityDetailRoute
          slug={slug}
          initialPost={publishedPost ?? undefined}
          initialPosts={publishedPosts}
        />
      </main>
      <Footer />
    </>
  );
}
