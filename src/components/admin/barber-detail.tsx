"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CalendarOff,
  Plane,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { cn } from "@/lib/utils";
import { DAY_NAMES } from "@/lib/constants";
import { formatMoney, formatDate, formatTime, formatDuration } from "@/lib/format";
import {
  updateBarberProfile,
  toggleBarberService,
  addWorkingHour,
  deleteWorkingHour,
  addDayOff,
  deleteDayOff,
  addVacation,
  deleteVacation,
  countVacationConflicts,
} from "@/server/actions";

export interface BarberData {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  bio: string | null;
  isActive: boolean;
  assignedServiceIds: string[];
  allServices: { id: string; name: string; durationMinutes: number; price: number }[];
  workingHours: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
  daysOff: { id: string; date: string; reason: string | null }[];
  vacations: { id: string; startDate: string; endDate: string; reason: string | null }[];
  appointments: {
    id: string;
    start: string;
    status: string;
    price: number;
    serviceName: string;
    customerName: string;
  }[];
  currency: string;
}

export function BarberDetail({ data }: { data: BarberData }) {
  return (
    <Tabs defaultValue="profile">
      <TabsList className="mb-6 flex-wrap">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="hours">Working Hours</TabsTrigger>
        <TabsTrigger value="daysoff">Days Off</TabsTrigger>
        <TabsTrigger value="vacation">Vacation</TabsTrigger>
        <TabsTrigger value="appointments">Appointments</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab data={data} />
      </TabsContent>
      <TabsContent value="services">
        <ServicesTab data={data} />
      </TabsContent>
      <TabsContent value="hours">
        <WorkingHoursTab data={data} />
      </TabsContent>
      <TabsContent value="daysoff">
        <DaysOffTab data={data} />
      </TabsContent>
      <TabsContent value="vacation">
        <VacationTab data={data} />
      </TabsContent>
      <TabsContent value="appointments">
        <AppointmentsTab data={data} />
      </TabsContent>
    </Tabs>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ProfileTab({ data }: { data: BarberData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: data.displayName,
    phone: data.phone ?? "",
    email: data.email ?? "",
    bio: data.bio ?? "",
    isActive: data.isActive,
  });

  function save() {
    startTransition(async () => {
      const res = await updateBarberProfile(data.id, form);
      if (res.ok) {
        toast.success("Profile updated");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <Panel title="Profile" description="Basic details shown on the public site.">
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>First name</Label>
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Last name</Label>
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Bio</Label>
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          <Label className="cursor-default">Active (accepting bookings)</Label>
        </div>
      </div>
      <div className="mt-6">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save profile
        </Button>
      </div>
    </Panel>
  );
}

function ServicesTab({ data }: { data: BarberData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const assigned = new Set(data.assignedServiceIds);

  function toggle(serviceId: string, enabled: boolean) {
    startTransition(async () => {
      const res = await toggleBarberService(data.id, serviceId, enabled);
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    <Panel title="Services" description="Which services this barber offers.">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.allServices.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(s.durationMinutes)} · {formatMoney(s.price, data.currency)}
              </p>
            </div>
            <Switch
              checked={assigned.has(s.id)}
              onCheckedChange={(v) => toggle(s.id, v)}
              disabled={pending}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function WorkingHoursTab({ data }: { data: BarberData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");

  function add(day: number) {
    startTransition(async () => {
      const res = await addWorkingHour({ barberId: data.id, dayOfWeek: day, startTime: start, endTime: end });
      if (res.ok) {
        toast.success("Period added");
        setAddingDay(null);
        router.refresh();
      } else toast.error(res.error);
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteWorkingHour(id, data.id);
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  // Monday-first ordering
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Panel title="Working hours" description="Multiple periods per day are supported (e.g. a lunch break).">
      <div className="divide-y divide-border">
        {order.map((day) => {
          const periods = data.workingHours
            .filter((w) => w.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <div key={day} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <div className="w-28 shrink-0 font-medium">{DAY_NAMES[day]}</div>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {periods.length === 0 && (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
                {periods.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1.5 text-sm"
                  >
                    {p.startTime}–{p.endTime}
                    <button
                      onClick={() => remove(p.id)}
                      className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove period"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                ))}

                {addingDay === day ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 w-28" />
                    <span className="text-muted-foreground">–</span>
                    <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 w-28" />
                    <Button size="icon-sm" onClick={() => add(day)} disabled={pending}>
                      <Check className="size-4" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => setAddingDay(null)}>
                      ✕
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setAddingDay(day)}>
                    <Plus className="size-3.5" /> Add period
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function DaysOffTab({ data }: { data: BarberData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  function add() {
    if (!date) return toast.error("Pick a date");
    startTransition(async () => {
      const res = await addDayOff({ barberId: data.id, date, reason });
      if (res.ok) {
        toast.success("Day off added");
        setDate("");
        setReason("");
        router.refresh();
      } else toast.error(res.error);
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      await deleteDayOff(id, data.id);
      router.refresh();
    });
  }

  return (
    <Panel title="Days off" description="Individual dates when this barber is unavailable.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-48" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>Reason (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Personal day" />
        </div>
        <Button onClick={add} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {data.daysOff.length === 0 && (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            No days off scheduled.
          </p>
        )}
        {data.daysOff.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <CalendarOff className="size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{formatDate(d.date)}</p>
                {d.reason && <p className="text-xs text-muted-foreground">{d.reason}</p>}
              </div>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => remove(d.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function VacationTab({ data }: { data: BarberData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [conflicts, setConflicts] = useState<number | null>(null);

  async function checkAndAdd(force = false) {
    if (!startDate || !endDate) return toast.error("Pick start and end dates");
    if (!force) {
      const n = await countVacationConflicts(data.id, startDate, endDate);
      if (n > 0) {
        setConflicts(n);
        return;
      }
    }
    startTransition(async () => {
      const res = await addVacation({ barberId: data.id, startDate, endDate, reason });
      if (res.ok) {
        toast.success("Vacation added");
        setStartDate("");
        setEndDate("");
        setReason("");
        setConflicts(null);
        router.refresh();
      } else toast.error(res.error);
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      await deleteVacation(id, data.id);
      router.refresh();
    });
  }

  return (
    <Panel title="Vacation" description="Date ranges when this barber is away.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setConflicts(null); }} className="sm:w-44" />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setConflicts(null); }} className="sm:w-44" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>Reason (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Summer holiday" />
        </div>
        <Button onClick={() => checkAndAdd(false)} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </Button>
      </div>

      {conflicts !== null && conflicts > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {conflicts} existing appointment{conflicts > 1 ? "s" : ""} fall within this range.
            </p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Add the vacation anyway? You&apos;ll need to reschedule those appointments.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => checkAndAdd(true)} disabled={pending}>
                Add anyway
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConflicts(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {data.vacations.length === 0 && (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            No vacations scheduled.
          </p>
        )}
        {data.vacations.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Plane className="size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {formatDate(v.startDate)} → {formatDate(v.endDate)}
                </p>
                {v.reason && <p className="text-xs text-muted-foreground">{v.reason}</p>}
              </div>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => remove(v.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AppointmentsTab({ data }: { data: BarberData }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">Appointments</h2>
        <p className="text-sm text-muted-foreground">Recent and upcoming for {data.displayName}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.appointments.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="font-medium">{formatDate(a.start)}</div>
                <div className="text-xs text-muted-foreground">{formatTime(a.start)}</div>
              </TableCell>
              <TableCell>{a.customerName}</TableCell>
              <TableCell className="text-muted-foreground">{a.serviceName}</TableCell>
              <TableCell className="font-medium">{formatMoney(a.price, data.currency)}</TableCell>
              <TableCell>
                <StatusBadge status={a.status} />
              </TableCell>
            </TableRow>
          ))}
          {data.appointments.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                No appointments.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
