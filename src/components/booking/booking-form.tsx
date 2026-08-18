"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CheckCircle2,
  MessageCircle,
  Scissors,
  User,
  CalendarDays,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { customerDetailsSchema, type CustomerDetailsInput } from "@/lib/validations";
import { createBooking } from "@/server/actions";

interface Summary {
  serviceName: string;
  barberName: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  durationLabel: string;
}

export function BookingForm({
  serviceId,
  barberId,
  start,
  summary,
}: {
  serviceId: string;
  barberId: string;
  start: string;
  summary: Summary;
}) {
  const [pending, startTransition] = useTransition();
  const [, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<null | { phone: string }>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerDetailsInput>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", whatsappNumber: "", email: "", notes: "" },
  });

  function onSubmit(values: CustomerDetailsInput) {
    setSubmitting(true);
    startTransition(async () => {
      const res = await createBooking({ ...values, serviceId, barberId, start });
      setSubmitting(false);
      if (res.ok) {
        setSuccess({ phone: values.whatsappNumber || values.phone });
      } else {
        toast.error(res.error);
      }
    });
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
          <CheckCircle2 className="size-9" />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight">Booking confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          We&apos;ve saved your appointment. See you soon.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-left">
          <SummaryRows summary={summary} />
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <MessageCircle className="size-4" />
          WhatsApp confirmation sent to {success.phone}
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild>
            <Link href="/booking/service">Book another</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[1fr_320px]">
      <form onSubmit={handleSubmit(onSubmit)} className="order-2 space-y-5 md:order-1">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" required error={errors.firstName?.message}>
            <Input {...register("firstName")} placeholder="Andi" autoComplete="given-name" />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <Input {...register("lastName")} placeholder="Hysa" autoComplete="family-name" />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" required error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="+355 69 123 4567" autoComplete="tel" inputMode="tel" />
          </Field>
          <Field label="WhatsApp number" error={errors.whatsappNumber?.message} hint="For your confirmation">
            <Input {...register("whatsappNumber")} placeholder="Same as phone" inputMode="tel" />
          </Field>
        </div>

        <Field label="Email" error={errors.email?.message} hint="Optional">
          <Input {...register("email")} placeholder="andi@example.com" autoComplete="email" type="email" />
        </Field>

        <Field label="Notes" error={errors.notes?.message} hint="Optional">
          <Textarea {...register("notes")} placeholder="Anything we should know?" rows={3} />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Confirming…
            </>
          ) : (
            "Confirm booking"
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By confirming you agree to our cancellation policy.
        </p>
      </form>

      <aside className="order-1 md:order-2">
        <div className="rounded-xl border border-border bg-card p-6 md:sticky md:top-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your appointment
          </h2>
          <div className="mt-4">
            <SummaryRows summary={summary} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function SummaryRows({ summary }: { summary: Summary }) {
  return (
    <dl className="space-y-3 text-sm">
      <Row icon={Scissors} label="Service" value={summary.serviceName} />
      <Row icon={User} label="Barber" value={summary.barberName} />
      <Row icon={CalendarDays} label="Date" value={summary.dateLabel} />
      <Row icon={Clock} label="Time" value={`${summary.timeLabel} · ${summary.durationLabel}`} />
      <div className="flex items-center justify-between border-t border-border pt-3">
        <dt className="font-medium">Total</dt>
        <dd className="font-heading text-xl font-semibold">{summary.priceLabel}</dd>
      </div>
    </dl>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
