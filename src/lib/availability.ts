import { prisma } from "./prisma";
import { pad2, toDateKey } from "./format";

/**
 * AVAILABILITY ENGINE
 * -------------------
 * A slot is available for a barber on a given date only when it satisfies ALL of:
 *   - falls fully inside one of the barber's working periods (never crossing a break/boundary)
 *   - the date is not a Day Off for that barber
 *   - the date is not inside any Vacation range for that barber
 *   - it does not overlap an existing (non-cancelled) appointment
 *   - it is not in the past
 *
 * The same engine powers online booking, "Any Barber", and admin walk-ins.
 */

export interface SlotResult {
  time: string; // "HH:mm"
  start: string; // ISO string of slot start
  barberId: string; // concrete barber assigned to this slot
}

interface Period {
  start: number; // minutes from midnight
  end: number;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToDate(base: Date, minutes: number): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function getBookingInterval(): Promise<number> {
  const settings = await prisma.shopSetting.findFirst();
  return settings?.bookingInterval ?? 30;
}

/** Effective duration for a service when performed by a barber (respecting overrides). */
export async function resolveServiceForBarber(
  barberId: string,
  serviceId: string,
): Promise<{ durationMinutes: number; price: number } | null> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return null;
  const link = await prisma.barberService.findUnique({
    where: { barberId_serviceId: { barberId, serviceId } },
  });
  return {
    durationMinutes: link?.durationOverride ?? service.durationMinutes,
    price: link?.priceOverride ?? service.price,
  };
}

/** Core: available start times for ONE barber on ONE date for a service. */
export async function getSlotsForBarber(params: {
  barberId: string;
  serviceId: string;
  dateStr: string; // "YYYY-MM-DD"
  interval?: number;
  now?: Date;
  ignoreAppointmentId?: string;
}): Promise<Date[]> {
  const { barberId, serviceId, dateStr } = params;
  const now = params.now ?? new Date();
  const interval = params.interval ?? (await getBookingInterval());

  const resolved = await resolveServiceForBarber(barberId, serviceId);
  if (!resolved) return [];
  const duration = resolved.durationMinutes;

  const [y, m, d] = dateStr.split("-").map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
  const dayOfWeek = dayStart.getDay();

  // Barber must actually provide this service.
  const providesService = await prisma.barberService.findUnique({
    where: { barberId_serviceId: { barberId, serviceId } },
  });
  if (!providesService) return [];

  // Working periods for this weekday.
  const workingHours = await prisma.workingHour.findMany({
    where: { barberId, dayOfWeek, isActive: true },
  });
  if (workingHours.length === 0) return [];

  // Day off?
  const daysOff = await prisma.dayOff.findMany({ where: { barberId } });
  const key = toDateKey(dayStart);
  if (daysOff.some((off) => toDateKey(new Date(off.date)) === key)) return [];

  // Vacation covering this date?
  const vacations = await prisma.vacation.findMany({ where: { barberId } });
  const isOnVacation = vacations.some((v) => {
    const vs = toDateKey(new Date(v.startDate));
    const ve = toDateKey(new Date(v.endDate));
    return key >= vs && key <= ve;
  });
  if (isOnVacation) return [];

  // Existing appointments that day (cancelled ones free up the slot).
  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { not: "Cancelled" },
      id: params.ignoreAppointmentId ? { not: params.ignoreAppointmentId } : undefined,
      startDateTime: { lte: dayEnd },
      endDateTime: { gte: dayStart },
    },
    select: { startDateTime: true, endDateTime: true },
  });

  const periods: Period[] = workingHours
    .map((w) => ({ start: hhmmToMinutes(w.startTime), end: hhmmToMinutes(w.endTime) }))
    .sort((a, b) => a.start - b.start);

  const slots: Date[] = [];
  for (const period of periods) {
    for (let t = period.start; t + duration <= period.end; t += interval) {
      const slotStart = minutesToDate(dayStart, t);
      const slotEnd = minutesToDate(dayStart, t + duration);

      if (slotStart <= now) continue; // no past slots

      const clash = appointments.some((a) =>
        overlaps(slotStart, slotEnd, new Date(a.startDateTime), new Date(a.endDateTime)),
      );
      if (clash) continue;

      slots.push(slotStart);
    }
  }
  return slots;
}

/** Slots for a service across all barbers who provide it ("Any Barber"). */
export async function getSlotsAnyBarber(params: {
  serviceId: string;
  dateStr: string;
  now?: Date;
}): Promise<SlotResult[]> {
  const { serviceId, dateStr } = params;
  const interval = await getBookingInterval();

  const links = await prisma.barberService.findMany({
    where: { serviceId, barber: { isActive: true } },
    select: { barberId: true },
  });

  const byTime = new Map<string, string>(); // "HH:mm" -> barberId (first available)
  for (const { barberId } of links) {
    const slots = await getSlotsForBarber({ ...params, barberId, serviceId, interval, now: params.now });
    for (const s of slots) {
      const label = `${pad2(s.getHours())}:${pad2(s.getMinutes())}`;
      if (!byTime.has(label)) byTime.set(label, barberId);
    }
  }

  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, barberId]) => {
      const [h, mm] = time.split(":").map(Number);
      const [y, m, d] = dateStr.split("-").map(Number);
      const start = new Date(y, m - 1, d, h, mm, 0, 0);
      return { time, start: start.toISOString(), barberId };
    });
}

/** Unified entry used by the booking UI and API. */
export async function getAvailability(params: {
  serviceId: string;
  barberId: string; // concrete id or "any"
  dateStr: string;
  now?: Date;
  ignoreAppointmentId?: string;
}): Promise<SlotResult[]> {
  if (params.barberId === "any") {
    return getSlotsAnyBarber({ serviceId: params.serviceId, dateStr: params.dateStr, now: params.now });
  }
  const slots = await getSlotsForBarber({
    barberId: params.barberId,
    serviceId: params.serviceId,
    dateStr: params.dateStr,
    now: params.now,
    ignoreAppointmentId: params.ignoreAppointmentId,
  });
  return slots.map((s) => ({
    time: `${pad2(s.getHours())}:${pad2(s.getMinutes())}`,
    start: s.toISOString(),
    barberId: params.barberId,
  }));
}

/**
 * Authoritative check used right before creating an appointment.
 * Returns true when [start, start+duration) is bookable for the barber.
 * `ignoreAppointmentId` lets reschedules skip their own row.
 */
export async function isSlotBookable(params: {
  barberId: string;
  serviceId: string;
  start: Date;
  durationMinutes: number;
  now?: Date;
  ignoreAppointmentId?: string;
  allowPast?: boolean;
}): Promise<boolean> {
  const { barberId, serviceId, start, durationMinutes } = params;
  const now = params.now ?? new Date();
  const end = new Date(start.getTime() + durationMinutes * 60000);

  if (!params.allowPast && start <= now) return false;

  const providesService = await prisma.barberService.findUnique({
    where: { barberId_serviceId: { barberId, serviceId } },
  });
  if (!providesService) return false;

  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const key = toDateKey(dayStart);
  const dayOfWeek = dayStart.getDay();

  const workingHours = await prisma.workingHour.findMany({
    where: { barberId, dayOfWeek, isActive: true },
  });
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = startMin + durationMinutes;
  const insidePeriod = workingHours.some(
    (w) => startMin >= hhmmToMinutes(w.startTime) && endMin <= hhmmToMinutes(w.endTime),
  );
  if (!insidePeriod) return false;

  const daysOff = await prisma.dayOff.findMany({ where: { barberId } });
  if (daysOff.some((off) => toDateKey(new Date(off.date)) === key)) return false;

  const vacations = await prisma.vacation.findMany({ where: { barberId } });
  if (
    vacations.some((v) => {
      const vs = toDateKey(new Date(v.startDate));
      const ve = toDateKey(new Date(v.endDate));
      return key >= vs && key <= ve;
    })
  )
    return false;

  const clash = await prisma.appointment.findFirst({
    where: {
      barberId,
      status: { not: "Cancelled" },
      id: params.ignoreAppointmentId ? { not: params.ignoreAppointmentId } : undefined,
      startDateTime: { lt: end },
      endDateTime: { gt: start },
    },
    select: { id: true },
  });
  return !clash;
}
