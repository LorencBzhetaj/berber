import { redirect } from "next/navigation";
import { Clock, Scissors, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/server/data";
import { formatMoney, formatDuration } from "@/lib/format";
import { StepHeading } from "@/components/booking/step-heading";
import { SlotPicker } from "@/components/booking/slot-picker";

export const metadata = { title: "Choose a time" };

export default async function ChooseDatePage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; barberId?: string }>;
}) {
  const { serviceId, barberId } = await searchParams;
  if (!serviceId) redirect("/booking/service");
  if (!barberId) redirect(`/booking/barber?serviceId=${serviceId}`);

  const [service, settings] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    getSettings(),
  ]);
  if (!service) redirect("/booking/service");

  const barber =
    barberId === "any" ? null : await prisma.barber.findUnique({ where: { id: barberId } });
  if (barberId !== "any" && !barber) redirect(`/booking/barber?serviceId=${serviceId}`);

  return (
    <div>
      <StepHeading title="Pick a date & time" subtitle="Choose when you'd like to come in." />

      <div className="mx-auto mb-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-5 py-3 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Scissors className="size-4 text-brand" /> {service.name}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <User className="size-4 text-brand" /> {barber ? barber.displayName : "Any barber"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-4" /> {formatDuration(service.durationMinutes)}
        </span>
        <span className="font-semibold">{formatMoney(service.price, settings.currency)}</span>
      </div>

      <SlotPicker serviceId={serviceId} barberId={barberId} />
    </div>
  );
}
