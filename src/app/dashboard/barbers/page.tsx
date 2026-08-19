export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { Scissors, CalendarCheck, ChevronRight } from "lucide-react";
import { getAllBarbers } from "@/server/data";

export const metadata = { title: "Barbers" };

export default async function BarbersPage() {
  const barbers = await getAllBarbers();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {barbers.map((b) => (
        <Link
          key={b.id}
          href={`/dashboard/barbers/${b.id}`}
          className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4 p-5">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
              {b.photoUrl && <Image src={b.photoUrl} alt={b.displayName} fill className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-semibold">{b.displayName}</h2>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    b.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {b.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.bio}</p>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Scissors className="size-3.5" /> {b.services.length} services
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" /> {b._count.appointments} appts
            </span>
            <ChevronRight className="size-4 transition-colors group-hover:text-brand" />
          </div>
        </Link>
      ))}
    </div>
  );
}
