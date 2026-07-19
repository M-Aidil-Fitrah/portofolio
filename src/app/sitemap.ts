import type { MetadataRoute } from "next";
import { projects } from "@/lib/projects";
import { getPublishedActivities } from "@/lib/activities";
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
    {
      url: `${SITE_URL}/activities`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/en/activities`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...getPublishedActivities().flatMap((post) => [
      {
        url: `${SITE_URL}/activities/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      },
      {
        url: `${SITE_URL}/en/activities/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
    ]),
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
