// Always-English mirror; metadata canonicalizes to /activities/{slug}.
export const dynamic = "force-dynamic";

export {
  default,
  generateStaticParams,
  generateMetadata,
} from "../../../activities/[slug]/page";
