import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/server/data";
import { formatMoney, formatDuration, formatDateLong, formatTime } from "@/lib/format";
import { StepHeading } from "@/components/booking/step-heading";
import { BookingForm } from "@/components/booking/booking-form";

export const metadata = { title: "Your details" };

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; barberId?: string; start?: string }>;
}) {
  const { serviceId, barberId, start } = await searchParams;
  if (!serviceId || !barberId || !start) redirect("/booking/service");

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) redirect("/booking/service");

  const [service, settings] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    getSettings(),
  ]);
  if (!service) redirect("/booking/service");

  const barber =
    barberId === "any" ? null : await prisma.barber.findUnique({ where: { id: barberId } });

  return (
    <div>
      <StepHeading title="Your details" subtitle="Almost done — just a few details to confirm." />
      <BookingForm
        serviceId={serviceId}
        barberId={barberId}
        start={start}
        summary={{
          serviceName: service.name,
          barberName: barber ? barber.displayName : "First available",
          dateLabel: formatDateLong(startDate),
          timeLabel: formatTime(startDate),
          priceLabel: formatMoney(service.price, settings.currency),
          durationLabel: formatDuration(service.durationMinutes),
        }}
      />
    </div>
  );
}
