import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/AdminLogin";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

function safeNextPath(value: string | undefined) {
  return value?.startsWith("/admin/") && !value.startsWith("//")
    ? value
    : "/admin/activities";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  return <AdminLogin nextPath={nextPath} />;
}
