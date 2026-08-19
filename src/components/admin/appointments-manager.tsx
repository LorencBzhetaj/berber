"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMoney, formatDate, formatTime } from "@/lib/format";
import { STATUS_LABEL, APPOINTMENT_STATUSES } from "@/lib/constants";
import { StatusBadge } from "@/components/admin/status-badge";
import { AppointmentDetail, type AdminAppt } from "@/components/admin/appointment-detail";

const FILTERS = ["all", ...APPOINTMENT_STATUSES] as const;

export function AppointmentsManager({
  appts,
  barbers,
  currency,
}: {
  appts: AdminAppt[];
  barbers: { id: string; name: string }[];
  currency: string;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminAppt | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = appts.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (q) {
      const s = `${a.customerName} ${a.serviceName} ${a.barberName}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  function openAppt(a: AdminAppt) {
    setSelected(a);
    setOpen(true);
  }

  const counts = (status: string) =>
    status === "all" ? appts.length : appts.filter((a) => a.status === status).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : STATUS_LABEL[f as keyof typeof STATUS_LABEL]}
              <span className="ml-1.5 opacity-60">{counts(f)}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Barber</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => openAppt(a)}>
                <TableCell>
                  <div className="font-medium">{formatDate(a.start)}</div>
                  <div className="text-xs text-muted-foreground">{formatTime(a.start)}</div>
                </TableCell>
                <TableCell className="font-medium">{a.customerName}</TableCell>
                <TableCell className="text-muted-foreground">{a.serviceName}</TableCell>
                <TableCell className="text-muted-foreground">{a.barberName}</TableCell>
                <TableCell className="font-medium">{formatMoney(a.price, currency)}</TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No appointments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
