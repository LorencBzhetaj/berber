"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isSlotBookable, resolveServiceForBarber } from "@/lib/availability";
import { sendNotification } from "@/lib/notifications";
import {
  createBookingSchema,
  walkInSchema,
  serviceSchema,
  barberProfileSchema,
  workingHourSchema,
  dayOffSchema,
  vacationSchema,
  settingsSchema,
} from "@/lib/validations";
import { AppointmentStatus, NotificationType } from "@/lib/constants";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function revalidateAdmin() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/customers");
}

async function findOrCreateCustomer(input: {
  firstName: string;
  lastName?: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  notes?: string;
}) {
  const existing = await prisma.customer.findFirst({ where: { phone: input.phone } });
  if (existing) return existing;
  return prisma.customer.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName || "",
      phone: input.phone,
      whatsappNumber: input.whatsappNumber || input.phone,
      email: input.email || null,
      notes: input.notes || null,
    },
  });
}

/**
 * Public booking creation. Price & duration are resolved from the database
 * (never trusted from the client) and availability is re-checked inside a
 * transaction to prevent double booking.
 */
export async function createBooking(
  raw: unknown,
): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = createBookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid booking details" };
  }
  const input = parsed.data;
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Invalid time selected" };

  // Resolve a concrete barber (handles "any barber").
  let barberId = input.barberId;
  if (barberId === "any") {
    const candidates = await prisma.barber.findMany({
      where: { isActive: true, services: { some: { serviceId: input.serviceId } } },
      orderBy: { sortOrder: "asc" },
    });
    let chosen: string | null = null;
    for (const c of candidates) {
      const resolved = await resolveServiceForBarber(c.id, input.serviceId);
      if (!resolved) continue;
      if (await isSlotBookable({ barberId: c.id, serviceId: input.serviceId, start, durationMinutes: resolved.durationMinutes })) {
        chosen = c.id;
        break;
      }
    }
    if (!chosen) return { ok: false, error: "That time is no longer available. Please pick another slot." };
    barberId = chosen;
  }

  const resolved = await resolveServiceForBarber(barberId, input.serviceId);
  if (!resolved) return { ok: false, error: "Selected service is unavailable" };

  const bookable = await isSlotBookable({
    barberId,
    serviceId: input.serviceId,
    start,
    durationMinutes: resolved.durationMinutes,
  });
  if (!bookable) {
    return { ok: false, error: "That time is no longer available. Please pick another slot." };
  }

  const end = new Date(start.getTime() + resolved.durationMinutes * 60000);

  try {
    // Resolve the customer before the transaction so the tx stays tiny and fast.
    const customer = await findOrCreateCustomer(input);

    const appointment = await prisma.$transaction(
      async (tx) => {
        // Final overlap guard inside the transaction.
        const clash = await tx.appointment.findFirst({
          where: {
            barberId,
            status: { not: "Cancelled" },
            startDateTime: { lt: end },
            endDateTime: { gt: start },
          },
          select: { id: true },
        });
        if (clash) throw new Error("SLOT_TAKEN");

        return tx.appointment.create({
          data: {
            barberId,
            serviceId: input.serviceId,
            customerId: customer.id,
            startDateTime: start,
            endDateTime: end,
            status: "Confirmed",
            price: resolved.price,
            durationMinutes: resolved.durationMinutes,
            notes: input.notes || null,
            source: "Online",
          },
        });
      },
      { timeout: 15000, maxWait: 10000 },
    );

    await sendNotification(appointment.id, "BookingConfirmation");
    revalidateAdmin();
    return { ok: true, data: { appointmentId: appointment.id } };
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { ok: false, error: "That time was just booked. Please pick another slot." };
    }
    return { ok: false, error: "Could not create the booking. Please try again." };
  }
}

/** Admin walk-in / new appointment — uses the same availability engine. */
export async function createWalkIn(raw: unknown): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = walkInSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const input = parsed.data;
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Invalid time" };

  const resolved = await resolveServiceForBarber(input.barberId, input.serviceId);
  if (!resolved) return { ok: false, error: "Selected service is unavailable" };

  const bookable = await isSlotBookable({
    barberId: input.barberId,
    serviceId: input.serviceId,
    start,
    durationMinutes: resolved.durationMinutes,
  });
  if (!bookable) return { ok: false, error: "That time is not available for this barber." };

  const end = new Date(start.getTime() + resolved.durationMinutes * 60000);

  try {
    const customer = input.customerId
      ? await prisma.customer.findUnique({ where: { id: input.customerId } })
      : await findOrCreateCustomer(input);
    if (!customer) return { ok: false, error: "Customer not found" };

    const appointment = await prisma.$transaction(
      async (tx) => {
        const clash = await tx.appointment.findFirst({
          where: {
            barberId: input.barberId,
            status: { not: "Cancelled" },
            startDateTime: { lt: end },
            endDateTime: { gt: start },
          },
          select: { id: true },
        });
        if (clash) throw new Error("SLOT_TAKEN");

        return tx.appointment.create({
          data: {
            barberId: input.barberId,
            serviceId: input.serviceId,
            customerId: customer.id,
            startDateTime: start,
            endDateTime: end,
            status: "Confirmed",
            price: resolved.price,
            durationMinutes: resolved.durationMinutes,
            notes: input.notes || null,
            source: "WalkIn",
          },
        });
      },
      { timeout: 15000, maxWait: 10000 },
    );

    await sendNotification(appointment.id, "BookingConfirmation");
    revalidateAdmin();
    return { ok: true, data: { appointmentId: appointment.id } };
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { ok: false, error: "That time was just booked." };
    }
    return { ok: false, error: "Could not create the appointment." };
  }
}

const STATUS_NOTIFICATION: Partial<Record<AppointmentStatus, NotificationType>> = {
  Completed: "Completed",
  Cancelled: "Cancellation",
  NoShow: "NoShow",
};

export async function setAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<ActionResult> {
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return { ok: false, error: "Appointment not found" };

  await prisma.appointment.update({ where: { id }, data: { status } });
  const notif = STATUS_NOTIFICATION[status];
  if (notif) await sendNotification(id, notif);

  revalidateAdmin();
  revalidatePath(`/dashboard/appointments`);
  return { ok: true };
}

export async function rescheduleAppointment(
  id: string,
  newStartIso: string,
  newBarberId?: string,
): Promise<ActionResult> {
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return { ok: false, error: "Appointment not found" };

  const barberId = newBarberId || appt.barberId;
  const start = new Date(newStartIso);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Invalid time" };

  const resolved = await resolveServiceForBarber(barberId, appt.serviceId);
  if (!resolved) return { ok: false, error: "Service unavailable for this barber" };

  const bookable = await isSlotBookable({
    barberId,
    serviceId: appt.serviceId,
    start,
    durationMinutes: resolved.durationMinutes,
    ignoreAppointmentId: id,
  });
  if (!bookable) return { ok: false, error: "That time is not available." };

  const end = new Date(start.getTime() + resolved.durationMinutes * 60000);
  await prisma.appointment.update({
    where: { id },
    data: { startDateTime: start, endDateTime: end, barberId, price: resolved.price, durationMinutes: resolved.durationMinutes },
  });
  await sendNotification(id, "Reschedule");
  revalidateAdmin();
  return { ok: true };
}

// ---- Services ---------------------------------------------------------------
export async function upsertService(id: string | null, raw: unknown): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const data = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    durationMinutes: parsed.data.durationMinutes,
    price: parsed.data.price,
    isActive: parsed.data.isActive,
  };
  if (id) {
    await prisma.service.update({ where: { id }, data });
  } else {
    const count = await prisma.service.count();
    await prisma.service.create({ data: { ...data, sortOrder: count + 1 } });
  }
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleServiceActive(id: string, isActive: boolean): Promise<ActionResult> {
  await prisma.service.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/services");
  return { ok: true };
}

// ---- Barbers ----------------------------------------------------------------
export async function updateBarberProfile(id: string, raw: unknown): Promise<ActionResult> {
  const parsed = barberProfileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  await prisma.barber.update({
    where: { id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      displayName: parsed.data.displayName,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      bio: parsed.data.bio || null,
      isActive: parsed.data.isActive,
    },
  });
  revalidatePath(`/dashboard/barbers/${id}`);
  revalidatePath("/dashboard/barbers");
  return { ok: true };
}

export async function toggleBarberService(
  barberId: string,
  serviceId: string,
  enabled: boolean,
): Promise<ActionResult> {
  if (enabled) {
    await prisma.barberService.upsert({
      where: { barberId_serviceId: { barberId, serviceId } },
      update: {},
      create: { barberId, serviceId },
    });
  } else {
    await prisma.barberService.deleteMany({ where: { barberId, serviceId } });
  }
  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true };
}

// ---- Working hours ----------------------------------------------------------
export async function addWorkingHour(raw: unknown): Promise<ActionResult> {
  const parsed = workingHourSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  if (parsed.data.startTime >= parsed.data.endTime) {
    return { ok: false, error: "End time must be after start time" };
  }
  await prisma.workingHour.create({
    data: {
      barberId: parsed.data.barberId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    },
  });
  revalidatePath(`/dashboard/barbers/${parsed.data.barberId}`);
  return { ok: true };
}

export async function deleteWorkingHour(id: string, barberId: string): Promise<ActionResult> {
  await prisma.workingHour.delete({ where: { id } });
  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true };
}

// ---- Days off ---------------------------------------------------------------
export async function addDayOff(raw: unknown): Promise<ActionResult> {
  const parsed = dayOffSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const [y, m, d] = parsed.data.date.split("-").map(Number);
  await prisma.dayOff.create({
    data: {
      barberId: parsed.data.barberId,
      date: new Date(y, m - 1, d, 0, 0, 0, 0),
      reason: parsed.data.reason || null,
    },
  });
  revalidatePath(`/dashboard/barbers/${parsed.data.barberId}`);
  return { ok: true };
}

export async function deleteDayOff(id: string, barberId: string): Promise<ActionResult> {
  await prisma.dayOff.delete({ where: { id } });
  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true };
}

// ---- Vacation ---------------------------------------------------------------
/** Count appointments that would clash with a proposed vacation range. */
export async function countVacationConflicts(
  barberId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const [ys, ms, ds] = startDate.split("-").map(Number);
  const [ye, me, de] = endDate.split("-").map(Number);
  const start = new Date(ys, ms - 1, ds, 0, 0, 0, 0);
  const end = new Date(ye, me - 1, de, 23, 59, 59, 999);
  return prisma.appointment.count({
    where: {
      barberId,
      status: { not: "Cancelled" },
      startDateTime: { gte: start, lte: end },
    },
  });
}

export async function addVacation(raw: unknown): Promise<ActionResult> {
  const parsed = vacationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  if (parsed.data.startDate > parsed.data.endDate) {
    return { ok: false, error: "End date must be after start date" };
  }
  const [ys, ms, ds] = parsed.data.startDate.split("-").map(Number);
  const [ye, me, de] = parsed.data.endDate.split("-").map(Number);
  await prisma.vacation.create({
    data: {
      barberId: parsed.data.barberId,
      startDate: new Date(ys, ms - 1, ds, 0, 0, 0, 0),
      endDate: new Date(ye, me - 1, de, 0, 0, 0, 0),
      reason: parsed.data.reason || null,
    },
  });
  revalidatePath(`/dashboard/barbers/${parsed.data.barberId}`);
  return { ok: true };
}

export async function deleteVacation(id: string, barberId: string): Promise<ActionResult> {
  await prisma.vacation.delete({ where: { id } });
  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true };
}

// ---- Customer ---------------------------------------------------------------
export async function updateCustomerNotes(id: string, notes: string): Promise<ActionResult> {
  await prisma.customer.update({ where: { id }, data: { notes: notes || null } });
  revalidatePath(`/dashboard/customers/${id}`);
  return { ok: true };
}

// ---- Settings ---------------------------------------------------------------
export async function updateSettings(raw: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const existing = await prisma.shopSetting.findFirst();
  const data = {
    shopName: parsed.data.shopName,
    phone: parsed.data.phone || null,
    whatsapp: parsed.data.whatsapp || null,
    address: parsed.data.address || null,
    email: parsed.data.email || null,
    currency: parsed.data.currency,
    bookingInterval: parsed.data.bookingInterval,
    cancellationHours: parsed.data.cancellationHours,
  };
  if (existing) {
    await prisma.shopSetting.update({ where: { id: existing.id }, data });
  } else {
    await prisma.shopSetting.create({ data });
  }
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}
