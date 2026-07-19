import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { ActivityAdmin } from "@/components/admin/ActivityAdmin";

export const metadata: Metadata = {
  title: "Activity Studio",
  robots: { index: false, follow: false },
};

export default function AdminActivitiesPage() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        <ActivityAdmin />
      </main>
    </>
  );
}

