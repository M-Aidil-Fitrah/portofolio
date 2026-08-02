import { AdminBar } from "@/components/admin/AdminBar";
import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";
import { AdminWorkspaceProvider } from "@/components/admin/AdminWorkspaceProvider";
import { PreviewProvider } from "@/components/providers/PreviewProvider";

export default function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminSessionGuard>
      <AdminWorkspaceProvider>
        <PreviewProvider>
          <div className="relative flex min-h-screen flex-col bg-ink">
            <AdminBar />
            <main id="main" className="flex-1">
              {children}
            </main>
          </div>
        </PreviewProvider>
      </AdminWorkspaceProvider>
    </AdminSessionGuard>
  );
}
