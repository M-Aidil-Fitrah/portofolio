import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { isAdminAuthenticated } from "@/lib/admin-auth";

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

  if (await isAdminAuthenticated()) redirect(nextPath);

  return <AdminLogin nextPath={nextPath} />;
}
