/**
 * Explicit-English mirror of /activities (see app/en/page.tsx for the
 * rationale). Metadata keeps canonicalizing to /activities, so this route
 * never competes with the original in search.
 */
export const dynamic = "force-dynamic";

export { default, metadata } from "../../activities/page";
