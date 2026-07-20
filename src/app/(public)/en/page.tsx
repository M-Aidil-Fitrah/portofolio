import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import Home from "../page";

/**
 * Explicit-English mirror of the landing page. The root URL already
 * server-renders English (Indonesian is a client-side enhancement), so
 * this route exists as a shareable, always-English address — it
 * canonicalizes to the root to avoid competing with it in search.
 */
export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default Home;
