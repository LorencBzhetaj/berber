"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSettings } from "@/server/actions";

interface Settings {
  shopName: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  email: string | null;
  currency: string;
  bookingInterval: number;
  cancellationHours: number;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    shopName: settings.shopName,
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
    address: settings.address ?? "",
    email: settings.email ?? "",
    currency: settings.currency,
    bookingInterval: settings.bookingInterval,
    cancellationHours: settings.cancellationHours,
  });

  function save() {
    if (!form.shopName.trim()) return toast.error("Shop name is required");
    startTransition(async () => {
      const res = await updateSettings(form);
      if (res.ok) {
        toast.success("Settings saved");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Section title="Shop details" description="Shown across the public site and booking pages.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldFull label="Shop name">
            <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          </FieldFull>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <FieldFull label="Address">
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          </FieldFull>
        </div>
      </Section>

      <Section title="Booking rules" description="Control how appointments are scheduled and cancelled.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Currency">
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="ALL">ALL (L)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Booking interval (min)">
            <Select
              value={String(form.bookingInterval)}
              onValueChange={(v) => setForm({ ...form, bookingInterval: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 20, 30, 45, 60].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cancellation deadline (h)">
            <Input
              type="number"
              value={form.cancellationHours}
              onChange={(e) => setForm({ ...form, cancellationHours: Number(e.target.value) })}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Customers can cancel until {form.cancellationHours} hour(s) before their appointment.
        </p>
      </Section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function FieldFull({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
