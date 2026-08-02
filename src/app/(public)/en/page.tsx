import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import Home from "../page";

// Always-English, shareable mirror of the landing page; canonicalizes to /.
export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default Home;
