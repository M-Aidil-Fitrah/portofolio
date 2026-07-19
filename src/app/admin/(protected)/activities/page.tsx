import type { Metadata } from "next";
import { ActivityAdmin } from "@/components/admin/ActivityAdmin";

export const metadata: Metadata = {
  title: "Activity Studio",
  robots: { index: false, follow: false },
};

export default function AdminActivitiesPage() {
  return <ActivityAdmin />;
}
