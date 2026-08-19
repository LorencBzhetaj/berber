"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toDateKey } from "@/lib/format";
import { ANY_BARBER } from "@/lib/constants";
import { createWalkIn } from "@/server/actions";

interface Option {
  id: string;
  name: string;
}

interface Slot {
  time: string;
  start: string;
  barberId: string;
}

export function WalkInDialog({
  services,
  barbers,
  triggerLabel = "New appointment",
  triggerVariant = "default",
  defaultBarberId,
}: {
  services: Option[];
  barbers: Option[];
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
  defaultBarberId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState(defaultBarberId ?? ANY_BARBER);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // reset when closing
  useEffect(() => {
    if (!open) {
      setServiceId("");
      setBarberId(defaultBarberId ?? ANY_BARBER);
      setDate(toDateKey(new Date()));
      setSlots([]);
      setSelectedSlot(null);
      setFirstName("");
      setLastName("");
      setPhone("");
    }
  }, [open, defaultBarberId]);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
    let active = true;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/availability?serviceId=${serviceId}&barberId=${barberId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => active && setSlots(d.slots ?? []))
      .catch(() => active && setSlots([]))
      .finally(() => active && setLoadingSlots(false));
    return () => {
      active = false;
    };
  }, [serviceId, barberId, date]);

  function submit() {
    if (!serviceId) return toast.error("Select a service");
    if (!selectedSlot) return toast.error("Select a time");
    if (!firstName.trim() || !phone.trim()) return toast.error("Customer name and phone are required");

    startTransition(async () => {
      const res = await createWalkIn({
        serviceId,
        barberId: selectedSlot.barberId,
        firstName,
        lastName,
        phone,
        start: selectedSlot.start,
      });
      if (res.ok) {
        toast.success("Appointment created");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm">
          <Plus className="size-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Walk-in or phone booking — uses live availability, just like online bookings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Barber</Label>
              <Select value={barberId} onValueChange={setBarberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Any barber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_BARBER}>Any barber</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              min={toDateKey(new Date())}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Available times</Label>
            {!serviceId ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Select a service to see times
              </p>
            ) : loadingSlots ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                <CalendarX2 className="size-5" /> No availability on this day
              </div>
            ) : (
              <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => setSelectedSlot(s)}
                    className={cn(
                      "rounded-md border py-1.5 text-sm font-medium transition-colors",
                      selectedSlot?.start === s.start
                        ? "border-brand bg-brand/15 text-foreground"
                        : "border-border hover:border-brand/60",
                    )}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label>First name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Andi" />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Hysa" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+355 69 123 4567" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
