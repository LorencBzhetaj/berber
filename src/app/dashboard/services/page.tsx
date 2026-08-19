export const dynamic = "force-dynamic";

import { getServiceStats, getSettings } from "@/server/data";
import { ServiceManager } from "@/components/admin/service-manager";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([getServiceStats(), getSettings()]);

  return (
    <ServiceManager
      currency={settings.currency}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        isActive: s.isActive,
        appointments: s._count.appointments,
      }))}
    />
  );
}
