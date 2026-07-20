import { ImageResponse } from "next/og";
import { getProject, projects } from "@/lib/projects";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "#e8e6e1",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#d9ff3d",
          }}
        >
          {project ? `${project.index} — ${project.year}` : "Project"}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 104,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: -2,
            marginTop: 24,
          }}
        >
          {project?.title ?? "Untitled"}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            marginTop: 32,
            color: "#7a7a72",
            maxWidth: 900,
          }}
        >
          {project?.stack.join("  ·  ") ?? ""}
        </div>
      </div>
    ),
    { ...size }
  );
}
