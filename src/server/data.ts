import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { toDateKey } from "@/lib/format";

export { getSettings };

export async function getActiveServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllServices() {
  return prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getServiceStats() {
  const services = await prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { appointments: true, barbers: true } },
    },
  });
  return services;
}

export async function getActiveBarbers() {
  return prisma.barber.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { services: { select: { serviceId: true } } },
  });
}

export async function getAllBarbers() {
  return prisma.barber.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: { select: { serviceId: true } },
      _count: { select: { appointments: true } },
    },
  });
}

export async function getBarbersForService(serviceId: string) {
  return prisma.barber.findMany({
    where: { isActive: true, services: { some: { serviceId } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getBarberDetail(id: string) {
  return prisma.barber.findUnique({
    where: { id },
    include: {
      services: { include: { service: true } },
      workingHours: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      daysOff: { orderBy: { date: "asc" } },
      vacations: { orderBy: { startDate: "asc" } },
      appointments: {
        orderBy: { startDateTime: "desc" },
        take: 50,
        include: { customer: true, service: true },
      },
    },
  });
}

export async function getCustomers() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      appointments: {
        select: { status: true, price: true, startDateTime: true },
      },
    },
  });
  return customers.map((c) => {
    const completed = c.appointments.filter((a) => a.status === "Completed");
    const lastVisit = completed
      .map((a) => a.startDateTime)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      whatsappNumber: c.whatsappNumber,
      email: c.email,
      total: c.appointments.length,
      completed: completed.length,
      cancelled: c.appointments.filter((a) => a.status === "Cancelled").length,
      noShows: c.appointments.filter((a) => a.status === "NoShow").length,
      totalSpent: completed.reduce((s, a) => s + a.price, 0),
      lastVisit: lastVisit ?? null,
    };
  });
}

export async function getCustomerDetail(id: string) {
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { startDateTime: "desc" },
        include: { barber: true, service: true },
      },
    },
  });
  if (!c) return null;

  const completed = c.appointments.filter((a) => a.status === "Completed");
  const counter = <T extends string>(items: T[]) => {
    const map = new Map<T, number>();
    for (const i of items) map.set(i, (map.get(i) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };

  const favoriteBarber = counter(completed.map((a) => a.barber.displayName));
  const favoriteService = counter(completed.map((a) => a.service.name));

  return {
    ...c,
    stats: {
      total: c.appointments.length,
      completed: completed.length,
      cancelled: c.appointments.filter((a) => a.status === "Cancelled").length,
      noShows: c.appointments.filter((a) => a.status === "NoShow").length,
      totalSpent: completed.reduce((s, a) => s + a.price, 0),
      lastVisit:
        completed.map((a) => a.startDateTime).sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
      favoriteBarber,
      favoriteService,
    },
  };
}

export async function getAppointments() {
  return prisma.appointment.findMany({
    orderBy: { startDateTime: "desc" },
    include: {
      customer: true,
      barber: true,
      service: true,
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getAppointmentDetail(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: true,
      barber: true,
      service: true,
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });
}

/** Appointments within a date range (calendar), grouped-ready. */
export async function getAppointmentsInRange(start: Date, end: Date) {
  return prisma.appointment.findMany({
    where: {
      startDateTime: { gte: start, lte: end },
      status: { not: "Cancelled" },
    },
    orderBy: { startDateTime: "asc" },
    include: { customer: true, barber: true, service: true },
  });
}

export async function getDashboardData() {
  const settings = await getSettings();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);

  const [all, barbers, services] = await Promise.all([
    prisma.appointment.findMany({
      include: { service: true, barber: true, customer: true },
    }),
    prisma.barber.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany(),
  ]);

  const isToday = (d: Date) => d >= todayStart && d <= todayEnd;
  const todays = all.filter((a) => isToday(a.startDateTime));

  const completedToday = todays.filter((a) => a.status === "Completed");
  const upcomingToday = todays.filter(
    (a) => a.status === "Confirmed" && a.startDateTime >= now,
  );

  const revenue = (list: typeof all) =>
    list.filter((a) => a.status === "Completed").reduce((s, a) => s + a.price, 0);

  const monthCompleted = all.filter(
    (a) => a.status === "Completed" && a.startDateTime >= monthStart,
  );

  // Revenue + appointments per day for the last 14 days
  const days: { key: string; label: string; revenue: number; appointments: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(todayStart.getDate() - i);
    const key = toDateKey(d);
    const dayAppts = all.filter((a) => toDateKey(a.startDateTime) === key);
    days.push({
      key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      revenue: dayAppts.filter((a) => a.status === "Completed").reduce((s, a) => s + a.price, 0),
      appointments: dayAppts.filter((a) => a.status !== "Cancelled").length,
    });
  }

  // Popular services (by completed count)
  const serviceCounts = services
    .map((s) => ({
      name: s.name,
      count: all.filter((a) => a.serviceId === s.id && a.status === "Completed").length,
    }))
    .sort((a, b) => b.count - a.count);

  // Appointments per barber (completed)
  const barberCounts = barbers.map((b) => ({
    name: b.displayName.split(" ")[0],
    count: all.filter((a) => a.barberId === b.id && a.status === "Completed").length,
  }));

  const completedAll = all.filter((a) => a.status === "Completed").length;
  const noShowAll = all.filter((a) => a.status === "NoShow").length;
  const noShowRate = completedAll + noShowAll > 0 ? noShowAll / (completedAll + noShowAll) : 0;

  const upcomingList = all
    .filter((a) => a.status === "Confirmed" && a.startDateTime >= now)
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime())
    .slice(0, 6);

  return {
    settings,
    cards: {
      todayCount: todays.length,
      upcoming: all.filter((a) => a.status === "Confirmed" && a.startDateTime >= now).length,
      completedToday: completedToday.length,
      cancelledToday: todays.filter((a) => a.status === "Cancelled").length,
      noShowToday: todays.filter((a) => a.status === "NoShow").length,
      todayRevenue: revenue(todays),
      weekRevenue: revenue(all.filter((a) => a.startDateTime >= weekStart)),
      monthRevenue: monthCompleted.reduce((s, a) => s + a.price, 0),
      noShowRate,
    },
    days,
    serviceCounts,
    barberCounts,
    upcomingList,
    todays: todays.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime()),
  };
}
