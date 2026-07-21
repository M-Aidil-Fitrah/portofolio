import type { CSSProperties } from "react";
import canvaIcon from "@/assets/tech/canva.svg";
import figmaIcon from "@/assets/tech/figma.svg";
import gitIcon from "@/assets/tech/git.svg";
import githubIcon from "@/assets/tech/github.svg";
import machineLearningIcon from "@/assets/tech/machine-learning.svg";
import nextjsIcon from "@/assets/tech/nextjs.svg";
import nodejsIcon from "@/assets/tech/nodejs.svg";
import postgresqlIcon from "@/assets/tech/postgresql.svg";
import prismaIcon from "@/assets/tech/prisma.svg";
import pythonIcon from "@/assets/tech/python.svg";
import reactIcon from "@/assets/tech/react.svg";
import supabaseIcon from "@/assets/tech/supabase.svg";
import tailwindIcon from "@/assets/tech/tailwind-css.svg";
import typescriptIcon from "@/assets/tech/typescript.svg";

type IconSource = string | { src: string };

const ICONS: Record<string, IconSource> = {
  Python: pythonIcon,
  TypeScript: typescriptIcon,
  "React.js": reactIcon,
  "Next.js": nextjsIcon,
  PostgreSQL: postgresqlIcon,
  Supabase: supabaseIcon,
  "Prisma ORM": prismaIcon,
  "Tailwind CSS": tailwindIcon,
  "Node.js": nodejsIcon,
  Git: gitIcon,
  GitHub: githubIcon,
  Figma: figmaIcon,
  Canva: canvaIcon,
  "Machine Learning": machineLearningIcon,
};

/** Each brand's real mark color, for the handful of spots that reveal it on
 * hover (see `colorOnHover`). Next.js/GitHub's marks are officially
 * monochrome black; on this near-black surface we use the white variant. */
const BRAND_COLORS: Record<string, string> = {
  Python: "#3776AB",
  TypeScript: "#3178C6",
  "React.js": "#61DAFB",
  "Next.js": "#FFFFFF",
  PostgreSQL: "#4169E1",
  Supabase: "#3ECF8E",
  "Prisma ORM": "#5A67D8",
  "Tailwind CSS": "#06B6D4",
  "Node.js": "#5FA04E",
  Git: "#F05032",
  GitHub: "#FFFFFF",
  Figma: "#F24E1E",
  Canva: "#00C4CC",
};

function sourceUrl(source: IconSource) {
  return typeof source === "string" ? source : source.src;
}

/** Whether a brand icon exists for this tool name — lets callers fall back
 * to plain text for tools without a vendored mark. */
export function hasTechIcon(name: string): boolean {
  return name in ICONS;
}

export function TechIcon({
  name,
  className,
  colorOnHover = false,
}: {
  name: string;
  className?: string;
  /** Swap from the current (usually muted) color to the brand's real color
   * on hover — the wrapping element needs the `group` class. */
  colorOnHover?: boolean;
}) {
  const icon = ICONS[name];
  if (!icon) return null;

  const brand = colorOnHover ? BRAND_COLORS[name] : undefined;
  const url = sourceUrl(icon);

  return (
    <span
      aria-hidden="true"
      className={`inline-block bg-current ${className ?? ""}${
        brand
          ? " transition-colors duration-300 group-hover:text-[var(--tech-brand)]"
          : ""
      }`}
      style={
        {
          "--tech-brand": brand,
          WebkitMaskImage: `url(${url})`,
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskImage: `url(${url})`,
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
        } as CSSProperties
      }
    />
  );
}
