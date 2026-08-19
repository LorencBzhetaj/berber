import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBarberDetail, getAllServices, getSettings } from "@/server/data";
import { BarberDetail, type BarberData } from "@/components/admin/barber-detail";

export const metadata = { title: "Barber" };

export default async function BarberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [barber, allServices, settings] = await Promise.all([
    getBarberDetail(id),
    getAllServices(),
    getSettings(),
  ]);
  if (!barber) notFound();

  const data: BarberData = {
    id: barber.id,
    firstName: barber.firstName,
    lastName: barber.lastName,
    displayName: barber.displayName,
    phone: barber.phone,
    email: barber.email,
    bio: barber.bio,
    isActive: barber.isActive,
    assignedServiceIds: barber.services.map((s) => s.serviceId),
    allServices: allServices.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: s.price,
    })),
    workingHours: barber.workingHours.map((w) => ({
      id: w.id,
      dayOfWeek: w.dayOfWeek,
      startTime: w.startTime,
      endTime: w.endTime,
    })),
    daysOff: barber.daysOff.map((d) => ({
      id: d.id,
      date: d.date.toISOString(),
      reason: d.reason,
    })),
    vacations: barber.vacations.map((v) => ({
      id: v.id,
      startDate: v.startDate.toISOString(),
      endDate: v.endDate.toISOString(),
      reason: v.reason,
    })),
    appointments: barber.appointments.map((a) => ({
      id: a.id,
      start: a.startDateTime.toISOString(),
      status: a.status,
      price: a.price,
      serviceName: a.service.name,
      customerName: `${a.customer.firstName} ${a.customer.lastName}`,
    })),
    currency: settings.currency,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/barbers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to barbers
      </Link>

      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
          {barber.photoUrl && <Image src={barber.photoUrl} alt={barber.displayName} fill className="object-cover" />}
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{barber.displayName}</h1>
          <p className="text-sm text-muted-foreground">{barber.email ?? barber.phone ?? "Barber"}</p>
        </div>
      </div>

      <BarberDetail data={data} />
    </div>
  );
}
