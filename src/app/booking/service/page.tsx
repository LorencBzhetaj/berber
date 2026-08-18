import Link from "next/link";
import { Scissors, Clock, ChevronRight } from "lucide-react";
import { getActiveServices, getSettings } from "@/server/data";
import { formatMoney, formatDuration } from "@/lib/format";
import { StepHeading } from "@/components/booking/step-heading";

export const metadata = { title: "Choose a service" };

export default async function ChooseServicePage({
  searchParams,
}: {
  searchParams: Promise<{ barberId?: string }>;
}) {
  const { barberId } = await searchParams;
  const [services, settings] = await Promise.all([getActiveServices(), getSettings()]);

  // If a barber was pre-selected (e.g. from the homepage), skip straight to date.
  const hrefFor = (serviceId: string) =>
    barberId
      ? `/booking/date?serviceId=${serviceId}&barberId=${barberId}`
      : `/booking/barber?serviceId=${serviceId}`;

  return (
    <div>
      <StepHeading title="Choose a service" subtitle="What can we do for you today?" />
      <div className="mx-auto grid max-w-2xl gap-3">
        {services.map((s) => (
          <Link
            key={s.id}
            href={hrefFor(s.id)}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-brand hover:shadow-sm"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <Scissors className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{s.name}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" /> {formatDuration(s.durationMinutes)}
              </p>
            </div>
            <div className="text-right">
              <div className="font-heading text-xl font-semibold">
                {formatMoney(s.price, settings.currency)}
              </div>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </div>
  );
}
