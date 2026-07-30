import { redirect } from "next/navigation";
import { AdminBar } from "@/components/admin/AdminBar";
import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";
import { AdminWorkspaceProvider } from "@/components/admin/AdminWorkspaceProvider";
import { PreviewProvider } from "@/components/providers/PreviewProvider";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login?next=/admin/activities");
  }

  return (
    <AdminWorkspaceProvider>
      <AdminSessionGuard />
      <PreviewProvider>
        <div className="relative flex min-h-screen flex-col bg-ink">
          <AdminBar />
          <main id="main" className="flex-1">
            {children}
          </main>
        </div>
      </PreviewProvider>
    </AdminWorkspaceProvider>
  );
}
