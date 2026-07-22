import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ActivityDetailRoute } from "@/components/activities/ActivityDetailRoute";
import { SITE_URL } from "@/lib/site";
import {
  getPersistedActivity,
  getPersistedPublishedActivities,
} from "@/lib/activity-persistence";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return (await getPersistedPublishedActivities()).map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPersistedActivity(slug);
  if (!post || post.status !== "published") return {};

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
  const post = await getPersistedActivity(slug);
  const publishedPost = post?.status === "published" ? post : null;

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
        />
      </main>
      <Footer />
    </>
  );
}
