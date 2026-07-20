import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudy } from "@/components/project/CaseStudy";
import { ProjectPager } from "@/components/project/ProjectPager";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getProject, projects } from "@/lib/projects";
import { SITE_URL } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.tagline.en,
    alternates: { canonical: `${SITE_URL}/projects/${project.slug}` },
    openGraph: {
      title: project.title,
      description: project.tagline.en,
      url: `${SITE_URL}/projects/${project.slug}`,
      type: "article",
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.tagline.en,
    dateCreated: project.date,
    author: { "@type": "Person", name: "Muhammad Aidil Fitrah" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main id="main" className="flex-1">
        <CaseStudy project={project} />
        <ProjectPager current={project} />
      </main>
      <Footer />
    </>
  );
}
