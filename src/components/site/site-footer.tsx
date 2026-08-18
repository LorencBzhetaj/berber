import Link from "next/link";
import { MapPin, Phone, Clock } from "lucide-react";
import { BrandMark } from "./brand-mark";

interface FooterProps {
  shopName: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
}

export function SiteFooter({ shopName, phone, address, email }: FooterProps) {
  return (
    <footer id="contact" className="mt-auto bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <BrandMark name={shopName} light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-sidebar-foreground/60">
            Premium grooming in the heart of Tirana. Sharp cuts, classic beard work
            and a relaxed chair every time.
          </p>
          <Link
            href="/booking/service"
            className="mt-6 inline-flex items-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
          >
            Book an appointment
          </Link>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-sidebar-foreground/80">
            Visit us
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-sidebar-foreground/60">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>{address ?? "Rruga Myslym Shyri 21, Tirana"}</span>
            </li>
            {phone && (
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand" />
                <a href={`tel:${phone}`} className="hover:text-white">{phone}</a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-sidebar-foreground/80">
            Opening hours
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-sidebar-foreground/60">
            <li className="flex items-center gap-2.5">
              <Clock className="size-4 shrink-0 text-brand" />
              <span>Mon–Fri · 09:00 – 19:00</span>
            </li>
            <li className="pl-6.5">Saturday · 09:00 – 17:00</li>
            <li className="pl-6.5">Sunday · Closed</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-sidebar-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-sidebar-foreground/50 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {shopName}. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-white">Staff login</Link>
            {email && <a href={`mailto:${email}`} className="hover:text-white">{email}</a>}
          </p>
        </div>
      </div>
    </footer>
  );
}
