import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---- deterministic RNG so the demo dataset is stable ------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260819);
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

// ---- helpers ----------------------------------------------------------------
function atMidnight(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function dateAt(day: Date, minutes: number) {
  const x = atMidnight(day);
  x.setMinutes(minutes);
  return x;
}
const hhmm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
const overlap = (
  aS: Date,
  aE: Date,
  bS: Date,
  bE: Date,
) => aS < bE && bS < aE;
const key = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Common weekly schedule (0=Sun ... 6=Sat)
const SCHEDULE: Record<number, [string, string][]> = {
  1: [["09:00", "13:00"], ["14:00", "19:00"]],
  2: [["09:00", "19:00"]],
  3: [["09:00", "19:00"]],
  4: [["09:00", "13:00"], ["14:00", "19:00"]],
  5: [["09:00", "19:00"]],
  6: [["09:00", "17:00"]],
};

async function main() {
  console.log("Clearing existing data…");
  await prisma.notification.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.barberService.deleteMany();
  await prisma.workingHour.deleteMany();
  await prisma.dayOff.deleteMany();
  await prisma.vacation.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.barber.deleteMany();
  await prisma.shopSetting.deleteMany();

  // ---- Shop settings --------------------------------------------------------
  await prisma.shopSetting.create({
    data: {
      shopName: "Barber House",
      phone: "+355 69 123 4567",
      whatsapp: "+355 69 123 4567",
      address: "Rruga Myslym Shyri 21, Tirana, Albania",
      email: "hello@barberhouse.al",
      currency: "EUR",
      bookingInterval: 30,
      cancellationHours: 2,
      timezone: "Europe/Tirane",
    },
  });

  // ---- Services -------------------------------------------------------------
  const serviceSeed = [
    { name: "Haircut", description: "Classic or modern cut, wash and finish.", durationMinutes: 30, price: 15, sortOrder: 1 },
    { name: "Beard", description: "Beard trim, line-up and hot towel.", durationMinutes: 20, price: 10, sortOrder: 2 },
    { name: "Haircut + Beard", description: "Full grooming: haircut paired with a beard trim.", durationMinutes: 45, price: 22, sortOrder: 3 },
    { name: "Kids Haircut", description: "Gentle haircut for children under 12.", durationMinutes: 25, price: 12, sortOrder: 4 },
    { name: "Hair Styling", description: "Wash, style and product finish for a special look.", durationMinutes: 30, price: 18, sortOrder: 5 },
  ];
  const services = [];
  for (const s of serviceSeed) services.push(await prisma.service.create({ data: s }));

  // ---- Barbers --------------------------------------------------------------
  const barberSeed = [
    {
      firstName: "Erion", lastName: "Hoxha", displayName: "Erion Hoxha",
      phone: "+355 69 200 1122", email: "erion@barberhouse.al",
      photoUrl: "/images/barbers/erion.jpg",
      bio: "Master barber with 12 years behind the chair. Specialises in classic scissor cuts and sharp fades.",
      sortOrder: 1,
    },
    {
      firstName: "Ardit", lastName: "Kola", displayName: "Ardit Kola",
      phone: "+355 69 200 3344", email: "ardit@barberhouse.al",
      photoUrl: "/images/barbers/ardit.jpg",
      bio: "Fade and beard specialist. Known for precise line-ups and a relaxed chair-side manner.",
      sortOrder: 2,
    },
    {
      firstName: "Klajdi", lastName: "Meta", displayName: "Klajdi Meta",
      phone: "+355 69 200 5566", email: "klajdi@barberhouse.al",
      photoUrl: "/images/barbers/klajdi.jpg",
      bio: "Modern styling and texture expert. Great with kids and first-time clients.",
      sortOrder: 3,
    },
  ];

  const barbers = [];
  for (const b of barberSeed) {
    const barber = await prisma.barber.create({ data: b });
    // working hours
    for (const [dow, periods] of Object.entries(SCHEDULE)) {
      for (const [start, end] of periods) {
        await prisma.workingHour.create({
          data: { barberId: barber.id, dayOfWeek: Number(dow), startTime: start, endTime: end },
        });
      }
    }
    // every barber provides every service (simple, rich demo)
    for (const s of services) {
      await prisma.barberService.create({ data: { barberId: barber.id, serviceId: s.id } });
    }
    barbers.push(barber);
  }

  const [erion, ardit, klajdi] = barbers;

  // ---- Days off & vacation --------------------------------------------------
  const today = atMidnight(new Date());
  // Erion: a personal day next week
  await prisma.dayOff.create({
    data: { barberId: erion.id, date: addDays(today, 6), reason: "Personal day" },
  });
  // Ardit: a day off in a few days
  await prisma.dayOff.create({
    data: { barberId: ardit.id, date: addDays(today, 3), reason: "Doctor appointment" },
  });
  // Klajdi: a vacation range next week
  await prisma.vacation.create({
    data: {
      barberId: klajdi.id,
      startDate: addDays(today, 8),
      endDate: addDays(today, 13),
      reason: "Summer holiday",
    },
  });

  const unavailable = (barberId: string, day: Date): boolean => {
    if (barberId === erion.id && key(day) === key(addDays(today, 6))) return true;
    if (barberId === ardit.id && key(day) === key(addDays(today, 3))) return true;
    if (barberId === klajdi.id) {
      const k = day.getTime();
      if (k >= addDays(today, 8).getTime() && k <= addDays(today, 13).getTime()) return true;
    }
    return false;
  };

  // ---- Customers ------------------------------------------------------------
  const firstNames = ["Andi", "Besnik", "Dritan", "Elton", "Fatjon", "Gentian", "Ilir", "Jetmir", "Kreshnik", "Lorenc", "Marsel", "Neritan", "Orges", "Petrit", "Redon", "Sokol", "Taulant", "Valon", "Arben", "Enea", "Denis", "Klodian", "Blerim", "Genci"];
  const lastNames = ["Hysa", "Dervishi", "Prifti", "Leka", "Bardhi", "Gjoni", "Rama", "Basha", "Cela", "Duka", "Shehu", "Zeqiri", "Nikaj", "Berisha", "Kraja", "Mema", "Vata", "Toska", "Lala", "Marku", "Currila", "Bushi", "Frasheri", "Cani"];

  const customers = [];
  for (let i = 0; i < 24; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const phone = `+355 69 ${randInt(200, 799)} ${randInt(1000, 9999)}`;
    customers.push(
      await prisma.customer.create({
        data: {
          firstName,
          lastName,
          phone,
          whatsappNumber: phone,
          email: rnd() > 0.35 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com` : null,
          notes: rnd() > 0.8 ? pick(["Prefers a low fade.", "Regular — every 3 weeks.", "Sensitive skin, no strong products.", "Always books with the same barber."]) : null,
        },
      }),
    );
  }

  // ---- Appointments ---------------------------------------------------------
  const now = new Date();
  const bookedByBarber: Record<string, { s: Date; e: Date }[]> = {};
  for (const b of barbers) bookedByBarber[b.id] = [];

  type ApptPayload = {
    barberId: string; customerId: string; serviceId: string;
    startDateTime: Date; endDateTime: Date; status: string;
    price: number; durationMinutes: number; source: string;
  };
  const appts: ApptPayload[] = [];

  for (let offset = -14; offset <= 10; offset++) {
    const day = addDays(today, offset);
    const dow = day.getDay();
    const periods = SCHEDULE[dow];
    if (!periods) continue; // Sunday

    for (const barber of barbers) {
      if (offset >= 0 && unavailable(barber.id, day)) continue;

      // Today is the busiest; taper off into past and future so the
      // dataset always has completed history AND upcoming appointments.
      let count: number;
      if (offset === 0) count = randInt(2, 3);
      else if (offset > 0) count = rnd() < 0.5 ? 1 : 0;
      else count = rnd() < 0.5 ? 1 : 0;

      let made = 0, attempts = 0;
      while (made < count && attempts < 25) {
        attempts++;
        const service = pick(services);
        const [pStart, pEnd] = pick(periods).map(hhmm);
        const latest = pEnd - service.durationMinutes;
        if (latest < pStart) continue;
        const steps = Math.floor((latest - pStart) / 30);
        const t = pStart + 30 * randInt(0, steps);
        const s = dateAt(day, t);
        const e = dateAt(day, t + service.durationMinutes);

        if (bookedByBarber[barber.id].some((bk) => overlap(s, e, bk.s, bk.e))) continue;
        bookedByBarber[barber.id].push({ s, e });
        made++;

        let status: string;
        if (e < now) {
          const r = rnd();
          status = r < 0.82 ? "Completed" : r < 0.93 ? "Cancelled" : "NoShow";
        } else {
          status = "Confirmed";
        }

        appts.push({
          barberId: barber.id,
          customerId: pick(customers).id,
          serviceId: service.id,
          startDateTime: s,
          endDateTime: e,
          status,
          price: service.price,
          durationMinutes: service.durationMinutes,
          source: rnd() > 0.75 ? "WalkIn" : "Online",
        });
      }
    }
  }

  // ensure at least one no-show and one cancellation in the past
  const pastCompleted = appts.filter((a) => a.status === "Completed" && a.endDateTime < now);
  if (!appts.some((a) => a.status === "NoShow") && pastCompleted[0]) pastCompleted[0].status = "NoShow";
  if (!appts.some((a) => a.status === "Cancelled") && pastCompleted[1]) pastCompleted[1].status = "Cancelled";

  for (const a of appts) {
    const created = await prisma.appointment.create({ data: a });
    // notification history (mock)
    await prisma.notification.create({
      data: {
        appointmentId: created.id,
        type: "BookingConfirmation",
        channel: "WhatsApp",
        status: "Sent",
        message: "Booking confirmation sent.",
        recipient: "",
        createdAt: new Date(created.startDateTime.getTime() - 24 * 3600 * 1000),
      },
    });
    if (a.status === "Completed") {
      await prisma.notification.create({
        data: { appointmentId: created.id, type: "Completed", channel: "WhatsApp", status: "Sent", message: "Thanks for visiting Barber House!", recipient: "", createdAt: a.endDateTime },
      });
    }
    if (a.status === "Cancelled") {
      await prisma.notification.create({
        data: { appointmentId: created.id, type: "Cancellation", channel: "WhatsApp", status: "Sent", message: "Appointment cancelled.", recipient: "", createdAt: a.startDateTime },
      });
    }
  }

  const counts = appts.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Seeded: ${services.length} services, ${barbers.length} barbers, ${customers.length} customers, ${appts.length} appointments`);
  console.log("Appointment status breakdown:", counts);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
