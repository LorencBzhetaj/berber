"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarX2, Sun, Sunset, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDateKey, pad2 } from "@/lib/format";
import { DAY_NAMES_SHORT } from "@/lib/constants";

interface Slot {
  time: string;
  start: string;
  barberId: string;
}

function buildDays(count: number) {
  const out: { key: string; date: Date; closed: boolean; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const closed = d.getDay() === 0; // Sunday
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY_NAMES_SHORT[d.getDay()];
    out.push({ key: toDateKey(d), date: d, closed, label });
  }
  return out;
}

const GROUPS = [
  { key: "morning", label: "Morning", icon: Sun, test: (h: number) => h < 12 },
  { key: "afternoon", label: "Afternoon", icon: Sunset, test: (h: number) => h >= 12 && h < 17 },
  { key: "evening", label: "Evening", icon: Moon, test: (h: number) => h >= 17 },
];

export function SlotPicker({
  serviceId,
  barberId,
}: {
  serviceId: string;
  barberId: string;
}) {
  const router = useRouter();
  const days = useMemo(() => buildDays(14), []);
  const firstOpen = days.find((d) => !d.closed) ?? days[0];
  const [selected, setSelected] = useState(firstOpen.key);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedDay = days.find((d) => d.key === selected)!;

  useEffect(() => {
    if (selectedDay.closed) {
      setSlots([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/availability?serviceId=${serviceId}&barberId=${barberId}&date=${selected}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setSlots(data.slots ?? []);
      })
      .catch(() => active && setSlots([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [selected, serviceId, barberId, selectedDay.closed]);

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: slots.filter((s) => g.test(Number(s.time.split(":")[0]))),
  })).filter((g) => g.items.length > 0);

  function choose(slot: Slot) {
    const params = new URLSearchParams({
      serviceId,
      barberId: slot.barberId, // resolve "any" to the concrete barber for this slot
      start: slot.start,
    });
    router.push(`/booking/confirmation?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Date selector */}
      <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d) => {
          const isActive = d.key === selected;
          return (
            <button
              key={d.key}
              type="button"
              disabled={d.closed}
              onClick={() => setSelected(d.key)}
              className={cn(
                "flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-3 transition-colors",
                isActive
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-border bg-card hover:border-brand/50",
                d.closed && "cursor-not-allowed opacity-40 hover:border-border",
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {d.label}
              </span>
              <span className="text-lg font-semibold">{pad2(d.date.getDate())}</span>
              <span className="text-[10px] text-muted-foreground">
                {d.closed ? "Closed" : DAY_NAMES_SHORT[d.date.getDay()]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slots */}
      <div className="mt-8 min-h-52">
        {loading ? (
          <div className="flex h-52 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Loading available times…</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-center">
            <CalendarX2 className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No availability on this day</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedDay.closed ? "The shop is closed on Sundays." : "Please try another date."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <div key={g.key}>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <g.icon className="size-4" /> {g.label}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {g.items.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => choose(slot)}
                      className="rounded-lg border border-border bg-card py-2.5 text-sm font-medium transition-colors hover:border-brand hover:bg-brand/10 hover:text-foreground"
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
