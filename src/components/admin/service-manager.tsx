"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { formatMoney, formatDuration } from "@/lib/format";
import { upsertService, toggleServiceActive } from "@/server/actions";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  appointments: number;
}

const EMPTY = { name: "", description: "", durationMinutes: 30, price: 15, isActive: true };

export function ServiceManager({
  services,
  currency,
}: {
  services: Service[];
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  function openNew() {
    setEditId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(s: Service) {
    setEditId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? "",
      durationMinutes: s.durationMinutes,
      price: s.price,
      isActive: s.isActive,
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    startTransition(async () => {
      const res = await upsertService(editId, form);
      if (res.ok) {
        toast.success(editId ? "Service updated" : "Service added");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function toggle(s: Service, next: boolean) {
    startTransition(async () => {
      const res = await toggleServiceActive(s.id, next);
      if (res.ok) {
        toast.success(next ? "Service activated" : "Service deactivated");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">All services</h2>
          <p className="text-sm text-muted-foreground">{services.length} services</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" /> Add service
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Bookings</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="font-medium">{s.name}</div>
                {s.description && (
                  <div className="line-clamp-1 text-xs text-muted-foreground">{s.description}</div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" /> {formatDuration(s.durationMinutes)}
                </span>
              </TableCell>
              <TableCell className="font-medium">{formatMoney(s.price, currency)}</TableCell>
              <TableCell className="text-muted-foreground">{s.appointments}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch checked={s.isActive} onCheckedChange={(v) => toggle(s, v)} disabled={pending} />
                  <span className="text-xs text-muted-foreground">
                    {s.isActive ? "Active" : "Hidden"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}>
                  <Pencil className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Haircut" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Classic or modern cut…"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price ({currency})</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label className="cursor-default">Active (visible for booking)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editId ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
