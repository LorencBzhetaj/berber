# Barber House — Booking & Management Demo

A polished, fully-functional demo of a barber-shop booking product for **Barber House**, Tirana. It pairs a premium public booking website with a complete admin dashboard, backed by a real database and a working availability engine.

> This is a sales/prototype demo. It intentionally omits multi-tenancy, real payments, real WhatsApp API, and authentication. It runs on PostgreSQL and deploys to Vercel.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix)
- **Prisma** ORM + **PostgreSQL** (Neon in the cloud; any Postgres locally)
- **React Hook Form** + **Zod** for forms & validation
- **Recharts** for dashboard analytics
- Server Actions for all mutations

## Features

**Public site**
- Premium responsive homepage (hero, services, barbers, why-us, gallery, contact)
- 4-step booking wizard: **Service → Barber → Date & time → Details**
- Live availability, "Any barber" option, simulated WhatsApp confirmation

**Availability engine** (`src/lib/availability.ts`)
- Computes real slots from working hours (with multiple periods/breaks), days off, vacation, existing appointments and service duration
- Backend re-validates every booking and prevents double-booking inside a transaction

**Admin dashboard** (`/dashboard`)
- KPI cards + charts (revenue, appointments, popular services, per-barber)
- **Calendar** — day view grouped by barber + week view
- **Appointments** — filter, search, complete / no-show / cancel / **reschedule**
- **Walk-in** bookings (same availability engine as online)
- **Customers** — CRM with per-customer stats, favourite barber/service, history, notes
- **Barbers** — tabbed management: Profile · Services · Working Hours · Days Off · Vacation · Appointments (with a conflict warning when a vacation overlaps existing appointments)
- **Services** — add / edit / activate / change price & duration
- **Settings** — shop details & booking rules (persisted to the database)
- Simulated WhatsApp notifications shown on each appointment

## Getting started (local)

Set `DATABASE_URL` in a `.env` file (copy `.env.example`) to your Postgres/Neon connection string, then:

```bash
npm install
npx prisma migrate deploy     # apply the schema to your database
npm run db:seed               # load realistic demo data
npm run dev                   # http://localhost:3000
```

- Public site: **http://localhost:3000**
- Admin dashboard: **http://localhost:3000/dashboard**

Reset / refresh the demo data at any time (re-anchors the "today" appointments to the current date):

```bash
npm run db:seed
```

## Deploying to Vercel

1. Create a Postgres database (Neon or Vercel Postgres) and copy its connection string.
2. In the Vercel project → **Settings → Environment Variables**, add `DATABASE_URL` for **Production, Preview and Development**.
3. Deploy. The build runs `prisma generate && prisma migrate deploy && next build`, so the schema is applied automatically.
4. Seed the data once (from your machine, with `DATABASE_URL` pointing at the same database): `npm run db:seed`.

## Demo flow

1. Open the homepage → **Book appointment**
2. Choose **Haircut** → **Erion** → a date → an available time
3. Enter details → **Confirm booking** → confirmation + "WhatsApp confirmation sent"
4. Open **/dashboard** → the booking appears live in the **Calendar**
5. Click it to see customer info, notifications, and status actions
6. Explore **Customers**, **Barbers** (tabs), **Services**, **Settings**, and the analytics on the **Dashboard**

## Project structure

```
prisma/
  schema.prisma        Data models (Barber, Service, BarberService, WorkingHour,
                       DayOff, Vacation, Customer, Appointment, Notification, ShopSetting)
  seed.ts              Deterministic realistic demo data
src/
  app/
    (public)/          Homepage (public marketing site)
    booking/           Booking wizard (service → barber → date → confirmation)
    dashboard/         Admin (calendar, appointments, customers, barbers, services, settings)
    api/availability/  Availability endpoint used by the booking UI
  components/
    site/  booking/  admin/  ui/
  lib/
    availability.ts    The availability engine
    notifications.ts   Mock WhatsApp / notification provider (swap for a real one)
    format.ts  constants.ts  validations.ts  settings.ts
  server/
    data.ts            Read queries
    actions.ts         Server Actions (bookings, status changes, CRUD)
```

## Notes on production readiness

- **Database**: runs on PostgreSQL. Point `DATABASE_URL` at a pooled connection for serverless (e.g. Neon's pooled URL) if you expect real traffic.
- **Notifications**: `src/lib/notifications.ts` is a mock. Replace the body of `sendNotification` with a real WhatsApp / SMS / email provider — the rest of the app is unchanged.
- **Auth**: the admin dashboard is open in the demo; add authentication before deploying.
