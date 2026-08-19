"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  UserX,
  XCircle,
  CalendarClock,
  MessageCircle,
  Phone,
  User,
  Scissors,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatMoney, formatDateLong, formatTime, toDateKey } from "@/lib/format";
import { NOTIFICATION_LABEL, type NotificationType } from "@/lib/constants";
import { StatusBadge } from "@/components/admin/status-badge";
import { setAppointmentStatus, rescheduleAppointment } from "@/server/actions";
import type { AppointmentStatus } from "@/lib/constants";

export interface AdminAppt {
  id: string;
  start: string;
  status: string;
  price: number;
  durationMinutes: number;
  source: string;
  notes: string | null;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  notifications: { id: string; type: string; status: string; createdAt: string }[];
}

interface Slot {
  time: string;
  start: string;
  barberId: string;
}

export function AppointmentDetail({
  appt,
  barbers,
  currency,
  open,
  onOpenChange,
}: {
  appt: AdminAppt | null;
  barbers: { id: string; name: string }[];
  currency: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"view" | "reschedule">("view");

  // reschedule state
  const [rBarber, setRBarber] = useState("");
  const [rDate, setRDate] = useState("");
  const [rSlots, setRSlots] = useState<Slot[]>([]);
  const [rSlot, setRSlot] = useState<Slot | null>(null);
  const [rLoading, setRLoading] = useState(false);

  useEffect(() => {
    if (open && appt) {
      setMode("view");
      setRBarber(appt.barberId);
      setRDate(toDateKey(new Date(appt.start)));
      setRSlot(null);
    }
  }, [open, appt]);

  useEffect(() => {
    if (mode !== "reschedule" || !appt || !rDate) return;
    let active = true;
    setRLoading(true);
    setRSlot(null);
    fetch(`/api/availability?serviceId=${appt.serviceId}&barberId=${rBarber}&date=${rDate}&ignore=${appt.id}`)
      .then((r) => r.json())
      .then((d) => active && setRSlots(d.slots ?? []))
      .catch(() => active && setRSlots([]))
      .finally(() => active && setRLoading(false));
    return () => {
      active = false;
    };
  }, [mode, rBarber, rDate, appt]);

  if (!appt) return null;

  function changeStatus(status: AppointmentStatus) {
    startTransition(async () => {
      const res = await setAppointmentStatus(appt!.id, status);
      if (res.ok) {
        toast.success(`Marked ${status === "NoShow" ? "no-show" : status.toLowerCase()}`);
        onOpenChange(false);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function doReschedule() {
    if (!rSlot) return toast.error("Select a new time");
    startTransition(async () => {
      const res = await rescheduleAppointment(appt!.id, rSlot.start, rSlot.barberId);
      if (res.ok) {
        toast.success("Appointment rescheduled");
        onOpenChange(false);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const start = new Date(appt.start);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Appointment <StatusBadge status={appt.status} />
          </DialogTitle>
          <DialogDescription>
            {appt.source === "WalkIn" ? "Walk-in booking" : "Online booking"}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" ? (
          <div className="space-y-5">
            <dl className="space-y-3 text-sm">
              <Row icon={User} label="Customer" value={appt.customerName} />
              <Row icon={Phone} label="Phone" value={appt.customerPhone} />
              <Row icon={Scissors} label="Service" value={appt.serviceName} />
              <Row icon={User} label="Barber" value={appt.barberName} />
              <Row icon={CalendarDays} label="Date" value={formatDateLong(start)} />
              <Row icon={Clock} label="Time" value={`${formatTime(start)} · ${appt.durationMinutes} min`} />
              <Row icon={MapPin} label="Source" value={appt.source === "WalkIn" ? "Walk-in" : "Online"} />
              <div className="flex items-center justify-between border-t border-border pt-3">
                <dt className="font-medium">Price</dt>
                <dd className="font-heading text-lg font-semibold">{formatMoney(appt.price, currency)}</dd>
              </div>
            </dl>

            {appt.notes && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">Notes</p>
                <p className="text-muted-foreground">{appt.notes}</p>
              </div>
            )}

            {/* Notifications (simulated) */}
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <MessageCircle className="size-4 text-emerald-600" /> Notifications
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Demo
                </span>
              </div>
              {appt.notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notifications sent yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {appt.notifications.map((n) => (
                    <li key={n.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {NOTIFICATION_LABEL[n.type as NotificationType] ?? n.type}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                        <CheckCircle2 className="size-3" /> {n.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {appt.status !== "Completed" && (
                <Button size="sm" onClick={() => changeStatus("Completed")} disabled={pending}>
                  <CheckCircle2 className="size-4" /> Complete
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setMode("reschedule")} disabled={pending}>
                <CalendarClock className="size-4" /> Reschedule
              </Button>
              {appt.status !== "NoShow" && (
                <Button size="sm" variant="outline" onClick={() => changeStatus("NoShow")} disabled={pending}>
                  <UserX className="size-4" /> No-show
                </Button>
              )}
              {appt.status !== "Cancelled" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={pending}>
                      <XCircle className="size-4" /> Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This frees up the slot and sends {appt.customerName} a cancellation notice.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep it</AlertDialogCancel>
                      <AlertDialogAction onClick={() => changeStatus("Cancelled")}>
                        Cancel appointment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Barber</Label>
                <Select value={rBarber} onValueChange={setRBarber}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={rDate} min={toDateKey(new Date())} onChange={(e) => setRDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>New time</Label>
              {rLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              ) : rSlots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  No availability on this day
                </p>
              ) : (
                <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
                  {rSlots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setRSlot(s)}
                      className={cn(
                        "rounded-md border py-1.5 text-sm font-medium transition-colors",
                        rSlot?.start === s.start
                          ? "border-brand bg-brand/15"
                          : "border-border hover:border-brand/60",
                      )}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="ghost" onClick={() => setMode("view")}>
                Back
              </Button>
              <Button onClick={doReschedule} disabled={pending || !rSlot}>
                {pending && <Loader2 className="size-4 animate-spin" />} Confirm reschedule
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
