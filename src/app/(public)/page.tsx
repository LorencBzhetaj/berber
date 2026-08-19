export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import {
  Scissors,
  ArrowRight,
  Clock,
  Star,
  MapPin,
  Award,
  Sparkles,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveServices, getActiveBarbers, getSettings } from "@/server/data";
import { formatMoney, formatDuration } from "@/lib/format";

const WHY = [
  {
    icon: Award,
    title: "Master barbers",
    body: "A hand-picked team with over a decade of experience in classic and modern cuts.",
  },
  {
    icon: CalendarCheck,
    title: "Book in seconds",
    body: "Pick a service, choose your barber and confirm — no calls, no waiting.",
  },
  {
    icon: Sparkles,
    title: "Premium products",
    body: "Only the finest grooming products for a finish that lasts all week.",
  },
  {
    icon: Clock,
    title: "On your schedule",
    body: "Real-time availability means the time you book is the time you're seen.",
  },
];

const GALLERY = ["/images/gallery/1.jpg", "/images/gallery/2.jpg", "/images/gallery/3.jpg", "/images/gallery/4.jpg", "/images/gallery/5.jpg", "/images/gallery/6.jpg"];

export default async function HomePage() {
  const [services, barbers, settings] = await Promise.all([
    getActiveServices(),
    getActiveBarbers(),
    getSettings(),
  ]);

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="relative isolate overflow-hidden bg-sidebar text-white">
        <Image
          src="/images/hero.jpg"
          alt="Barber House interior"
          fill
          priority
          className="object-cover object-center opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/70 to-sidebar/40" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 md:pb-32 md:pt-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-brand">
              <Scissors className="size-3.5" /> Est. Tirana
            </span>
            <h1 className="mt-6 font-heading text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Sharp looks,
              <br />
              <span className="text-brand">effortless booking.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
              {settings.shopName} is where precision meets a relaxed chair. Book
              your haircut, beard trim or full grooming in under a minute.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7 text-base">
                <Link href="/booking/service">
                  Book appointment <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/20 bg-white/5 px-7 text-base text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="#services">View services</Link>
              </Button>
            </div>

            <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                { n: "12+", l: "Years of craft" },
                { n: "3", l: "Master barbers" },
                { n: "4.9", l: "Average rating" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="font-heading text-3xl font-semibold text-white">{s.n}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-wider text-white/50">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---- Services ---- */}
      <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28">
        <SectionHeading
          eyebrow="Our services"
          title="Grooming, done properly"
          subtitle="Transparent pricing and honest timing. What you book is what you pay."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="grid size-11 place-items-center rounded-lg bg-brand/10 text-brand">
                  <Scissors className="size-5" />
                </div>
                <span className="font-heading text-2xl font-semibold">
                  {formatMoney(s.price, settings.currency)}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-4" /> {formatDuration(s.durationMinutes)}
                </span>
                <Link
                  href={`/booking/barber?serviceId=${s.id}`}
                  className="inline-flex items-center gap-1 font-medium text-foreground transition-colors group-hover:text-brand"
                >
                  Book <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Barbers ---- */}
      <section id="barbers" className="scroll-mt-20 bg-muted/40 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="The team"
            title="Meet your barbers"
            subtitle="Every one of our barbers is a specialist. Pick a favourite or let us match you."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b) => (
              <div key={b.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-4/5 overflow-hidden bg-muted">
                  {b.photoUrl && (
                    <Image
                      src={b.photoUrl}
                      alt={b.displayName}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{b.displayName}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      <Star className="size-3 fill-brand" /> 4.9
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {b.bio}
                  </p>
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link href={`/booking/service?barberId=${b.id}`}>Book with {b.firstName}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Why us ---- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <SectionHeading eyebrow="Why Barber House" title="Details that make the difference" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="rounded-xl border border-border bg-card p-6">
              <div className="grid size-11 place-items-center rounded-lg bg-brand/10 text-brand">
                <w.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-semibold">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Gallery ---- */}
      <section id="gallery" className="scroll-mt-20 bg-muted/40 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="The shop" title="A look inside" />
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3">
            {GALLERY.map((src, i) => (
              <div
                key={src}
                className={`relative overflow-hidden rounded-xl bg-muted ${
                  i === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-square"
                }`}
              >
                <Image src={src} alt="Barber House" fill className="object-cover transition-transform duration-500 hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="relative isolate overflow-hidden bg-sidebar text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 md:py-24">
          <MapPin className="mx-auto size-6 text-brand" />
          <h2 className="mt-5 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Ready for a fresh cut?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/60">
            Book your chair at {settings.shopName} today. Walk out looking your best.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 px-8 text-base">
            <Link href="/booking/service">
              Book appointment <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
