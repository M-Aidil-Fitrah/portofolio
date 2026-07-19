import type { MetadataRoute } from "next";
import { projects } from "@/lib/projects";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/en`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...projects.flatMap((project) => [
      {
        url: `${SITE_URL}/projects/${project.slug}`,
        lastModified: new Date(project.date),
        changeFrequency: "yearly" as const,
        priority: 0.8,
      },
      {
        url: `${SITE_URL}/en/projects/${project.slug}`,
        lastModified: new Date(project.date),
        changeFrequency: "yearly" as const,
        priority: 0.7,
      },
    ]),
  ];
}
