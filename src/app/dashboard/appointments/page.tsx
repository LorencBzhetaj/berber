export const dynamic = "force-dynamic";

import { getAppointments, getActiveBarbers, getSettings } from "@/server/data";
import { AppointmentsManager } from "@/components/admin/appointments-manager";
import type { AdminAppt } from "@/components/admin/appointment-detail";

export const metadata = { title: "Appointments" };

export default async function AppointmentsPage() {
  const [appts, barbers, settings] = await Promise.all([
    getAppointments(),
    getActiveBarbers(),
    getSettings(),
  ]);

  const mapped: AdminAppt[] = appts.map((a) => ({
    id: a.id,
    start: a.startDateTime.toISOString(),
    status: a.status,
    price: a.price,
    durationMinutes: a.durationMinutes,
    source: a.source,
    notes: a.notes,
    serviceId: a.serviceId,
    serviceName: a.service.name,
    barberId: a.barberId,
    barberName: a.barber.displayName,
    customerId: a.customerId,
    customerName: `${a.customer.firstName} ${a.customer.lastName}`,
    customerPhone: a.customer.phone,
    notifications: a.notifications.map((n) => ({
      id: n.id,
      type: n.type,
      status: n.status,
      createdAt: n.createdAt.toISOString(),
    })),
  }));

  return (
    <AppointmentsManager
      appts={mapped}
      barbers={barbers.map((b) => ({ id: b.id, name: b.displayName }))}
      currency={settings.currency}
    />
  );
}
