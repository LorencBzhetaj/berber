import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, ChevronRight, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getBarbersForService } from "@/server/data";
import { StepHeading } from "@/components/booking/step-heading";

export const metadata = { title: "Choose a barber" };

export default async function ChooseBarberPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { serviceId } = await searchParams;
  if (!serviceId) redirect("/booking/service");

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) redirect("/booking/service");

  const barbers = await getBarbersForService(serviceId);
  const q = `serviceId=${serviceId}`;

  return (
    <div>
      <StepHeading
        title="Choose your barber"
        subtitle={`Booking ${service.name} — pick a barber or let us find the first available.`}
      />
      <div className="mx-auto grid max-w-2xl gap-3">
        <Link
          href={`/booking/date?${q}&barberId=any`}
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-brand hover:shadow-sm"
        >
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <Users className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Any barber</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              First available — fastest way to get a slot.
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
        </Link>

        {barbers.map((b) => (
          <Link
            key={b.id}
            href={`/booking/date?${q}&barberId=${b.id}`}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-brand hover:shadow-sm"
          >
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted">
              {b.photoUrl && (
                <Image src={b.photoUrl} alt={b.displayName} fill className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{b.displayName}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand">
                  <Star className="size-3 fill-brand" /> 4.9
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{b.bio}</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </div>
  );
}
