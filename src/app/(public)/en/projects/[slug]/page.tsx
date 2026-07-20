/**
 * Explicit-English mirror of the project detail pages (see app/en/page.tsx
 * for the rationale). Re-exports the canonical route wholesale — metadata
 * keeps canonicalizing to /projects/{slug}, so the mirror never competes
 * with the original in search.
 */
export {
  default,
  generateStaticParams,
  generateMetadata,
} from "../../../projects/[slug]/page";
