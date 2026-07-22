/**
 * Explicit-English mirror of the activity detail pages (see app/en/page.tsx
 * for the rationale). Re-exports the canonical route wholesale — metadata
 * keeps canonicalizing to /activities/{slug}.
 */
export const dynamic = "force-dynamic";

export {
  default,
  generateStaticParams,
  generateMetadata,
} from "../../../activities/[slug]/page";
