import type { MetadataRoute } from "next";
import { projects } from "@/lib/projects";
import { getApiPublishedActivities } from "@/lib/api/activity-api";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activities = await getApiPublishedActivities().catch(() => []);
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
    ...activities.flatMap((post) => [
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
