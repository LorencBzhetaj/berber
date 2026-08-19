"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toDateKey, formatTime, pad2 } from "@/lib/format";
import { DAY_NAMES, DAY_NAMES_SHORT } from "@/lib/constants";
import { AppointmentDetail, type AdminAppt } from "@/components/admin/appointment-detail";

const START_MIN = 9 * 60; // 09:00
const END_MIN = 19 * 60; // 19:00
const STEP = 30;
const ROW_H = 52;

const STATUS_BLOCK: Record<string, string> = {
  Confirmed: "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-100",
  Completed: "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-100",
  NoShow: "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-100",
};

function minutesOf(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function CalendarView({
  appts,
  barbers,
  currency,
}: {
  appts: AdminAppt[];
  barbers: { id: string; name: string }[];
  currency: string;
}) {
  const [view, setView] = useState<"day" | "week">("day");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState<AdminAppt | null>(null);
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => appts.filter((a) => a.status !== "Cancelled"), [appts]);

  function openAppt(a: AdminAppt) {
    setSelected(a);
    setOpen(true);
  }

  function shift(dir: number) {
    const d = new Date(cursor);
    d.setDate(d.getDate() + dir * (view === "day" ? 1 : 7));
    setCursor(d);
  }
  function today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCursor(d);
  }

  const rows: number[] = [];
  for (let m = START_MIN; m < END_MIN; m += STEP) rows.push(m);

  // Week days (Mon-first)
  const weekDays = useMemo(() => {
    const monday = new Date(cursor);
    const dow = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [cursor]);

  const label =
    view === "day"
      ? `${DAY_NAMES[cursor.getDay()]}, ${cursor.getDate()} ${cursor.toLocaleString("en", { month: "long" })} ${cursor.getFullYear()}`
      : `${weekDays[0].getDate()} ${weekDays[0].toLocaleString("en", { month: "short" })} – ${weekDays[6].getDate()} ${weekDays[6].toLocaleString("en", { month: "short" })} ${weekDays[6].getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={today}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="ml-2 font-heading text-lg font-semibold">{label}</h2>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "day" ? (
        <DayGrid
          rows={rows}
          date={cursor}
          barbers={barbers}
          appts={visible}
          onOpen={openAppt}
        />
      ) : (
        <WeekGrid days={weekDays} appts={visible} onOpen={openAppt} />
      )}

      <AppointmentDetail
        appt={selected}
        barbers={barbers}
        currency={currency}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

function DayGrid({
  rows,
  date,
  barbers,
  appts,
  onOpen,
}: {
  rows: number[];
  date: Date;
  barbers: { id: string; name: string }[];
  appts: AdminAppt[];
  onOpen: (a: AdminAppt) => void;
}) {
  const key = toDateKey(date);
  const dayAppts = appts.filter((a) => toDateKey(new Date(a.start)) === key);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[720px]">
        {/* Header */}
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: `72px repeat(${barbers.length}, 1fr)` }}
        >
          <div className="border-r border-border" />
          {barbers.map((b) => (
            <div key={b.id} className="border-r border-border px-3 py-3 text-center last:border-r-0">
              <span className="font-semibold">{b.name}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `72px repeat(${barbers.length}, 1fr)` }}
        >
          {/* time gutter */}
          <div className="border-r border-border">
            {rows.map((m) => (
              <div key={m} className="relative border-b border-border/60" style={{ height: ROW_H }}>
                <span className="absolute -top-2 right-2 text-xs text-muted-foreground">
                  {pad2(Math.floor(m / 60))}:{pad2(m % 60)}
                </span>
              </div>
            ))}
          </div>

          {/* barber columns */}
          {barbers.map((b) => {
            const colAppts = dayAppts.filter((a) => a.barberId === b.id);
            return (
              <div
                key={b.id}
                className="relative border-r border-border last:border-r-0"
                style={{ height: rows.length * ROW_H }}
              >
                {rows.map((m) => (
                  <div key={m} className="border-b border-border/60" style={{ height: ROW_H }} />
                ))}
                {colAppts.map((a) => {
                  const startM = minutesOf(a.start);
                  const top = ((startM - START_MIN) / STEP) * ROW_H;
                  const height = Math.max((a.durationMinutes / STEP) * ROW_H - 4, 24);
                  if (startM < START_MIN || startM >= END_MIN) return null;
                  return (
                    <button
                      key={a.id}
                      onClick={() => onOpen(a)}
                      className={cn(
                        "absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-transform hover:z-10 hover:scale-[1.01]",
                        STATUS_BLOCK[a.status] ?? "bg-muted border-border",
                      )}
                      style={{ top, height }}
                    >
                      <div className="font-semibold leading-tight">{formatTime(a.start)}</div>
                      <div className="truncate leading-tight">{a.customerName}</div>
                      <div className="truncate leading-tight opacity-75">{a.serviceName}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  appts,
  onOpen,
}: {
  days: Date[];
  appts: AdminAppt[];
  onOpen: (a: AdminAppt) => void;
}) {
  const todayKey = toDateKey(new Date());
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="grid min-w-[860px] grid-cols-7">
        {days.map((d) => {
          const key = toDateKey(d);
          const dayAppts = appts
            .filter((a) => toDateKey(new Date(a.start)) === key)
            .sort((a, b) => a.start.localeCompare(b.start));
          const isToday = key === todayKey;
          return (
            <div key={key} className="min-h-[420px] border-r border-border last:border-r-0">
              <div
                className={cn(
                  "border-b border-border px-2 py-2 text-center",
                  isToday && "bg-brand/10",
                )}
              >
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  {DAY_NAMES_SHORT[d.getDay()]}
                </div>
                <div className={cn("font-heading text-lg font-semibold", isToday && "text-brand")}>
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-1.5 p-1.5">
                {dayAppts.length === 0 && (
                  <p className="pt-6 text-center text-xs text-muted-foreground">—</p>
                )}
                {dayAppts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onOpen(a)}
                    className={cn(
                      "w-full overflow-hidden rounded-md border px-2 py-1 text-left text-xs transition-colors",
                      STATUS_BLOCK[a.status] ?? "bg-muted border-border",
                    )}
                  >
                    <div className="font-semibold">{formatTime(a.start)}</div>
                    <div className="truncate">{a.customerName}</div>
                    <div className="truncate opacity-75">{a.barberName.split(" ")[0]}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
