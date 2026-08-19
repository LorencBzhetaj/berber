export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  CalendarDays,
  CalendarClock,
  Wallet,
  TrendingUp,
  CheckCircle2,
  XCircle,
  UserX,
  Percent,
  ArrowRight,
} from "lucide-react";
import { getDashboardData } from "@/server/data";
import { formatMoney, formatTime, formatDate } from "@/lib/format";
import { currencySymbol } from "@/lib/format";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { RevenueChart, AppointmentsChart, HorizontalCountChart } from "@/components/admin/charts";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const d = await getDashboardData();
  const cur = d.settings.currency;
  const sym = currencySymbol(cur);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's appointments" value={d.cards.todayCount} icon={CalendarDays} accent="brand" />
        <StatCard label="Upcoming" value={d.cards.upcoming} icon={CalendarClock} accent="blue" hint="Confirmed & future" />
        <StatCard label="Today's revenue" value={formatMoney(d.cards.todayRevenue, cur)} icon={Wallet} accent="emerald" />
        <StatCard label="Monthly revenue" value={formatMoney(d.cards.monthRevenue, cur)} icon={TrendingUp} accent="emerald" hint="Completed this month" />
        <StatCard label="Completed today" value={d.cards.completedToday} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Cancelled today" value={d.cards.cancelledToday} icon={XCircle} accent="rose" />
        <StatCard label="No-shows today" value={d.cards.noShowToday} icon={UserX} accent="amber" />
        <StatCard label="No-show rate" value={`${Math.round(d.cards.noShowRate * 100)}%`} icon={Percent} accent="amber" hint="All-time" />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue" subtitle="Last 14 days">
          <RevenueChart data={d.days} currency={sym} />
        </ChartCard>
        <ChartCard title="Appointments" subtitle="Last 14 days">
          <AppointmentsChart data={d.days} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Popular services" subtitle="Completed appointments">
          <HorizontalCountChart data={d.serviceCounts} colorVar="var(--chart-1)" />
        </ChartCard>
        <ChartCard title="Appointments per barber" subtitle="Completed appointments">
          <HorizontalCountChart data={d.barberCounts} colorVar="var(--chart-2)" />
        </ChartCard>
      </div>

      {/* Today + Upcoming */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Today&apos;s schedule</h2>
            <Link href="/dashboard/calendar" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              Calendar <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {d.todays.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">No appointments today.</li>
            )}
            {d.todays.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-14 shrink-0 font-mono text-sm text-muted-foreground">{formatTime(a.startDateTime)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.customer.firstName} {a.customer.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.service.name} · {a.barber.displayName}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Upcoming appointments</h2>
            <Link href="/dashboard/appointments" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              All <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {d.upcomingList.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing upcoming.</li>
            )}
            {d.upcomingList.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-20 shrink-0">
                  <p className="text-xs font-medium">{formatDate(a.startDateTime).replace(/,.*/, "")}</p>
                  <p className="font-mono text-sm text-muted-foreground">{formatTime(a.startDateTime)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.customer.firstName} {a.customer.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.service.name} · {a.barber.displayName}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium">{formatMoney(a.price, cur)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
