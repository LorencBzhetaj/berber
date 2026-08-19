import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { getSettings, getActiveServices, getActiveBarbers } from "@/server/data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, services, barbers] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getActiveBarbers(),
  ]);

  const serviceOptions = services.map((s) => ({ id: s.id, name: s.name }));
  const barberOptions = barbers.map((b) => ({ id: b.id, name: b.displayName }));

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <AdminSidebar shopName={settings.shopName} />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <AdminTopbar
          shopName={settings.shopName}
          services={serviceOptions}
          barbers={barberOptions}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
