"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AdminSidebar } from "./admin-sidebar";
import { WalkInDialog } from "./walk-in-dialog";

interface Option {
  id: string;
  name: string;
}

const TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === "/dashboard", title: "Dashboard" },
  { match: (p) => p.startsWith("/dashboard/calendar"), title: "Calendar" },
  { match: (p) => p.startsWith("/dashboard/appointments"), title: "Appointments" },
  { match: (p) => p.startsWith("/dashboard/customers"), title: "Customers" },
  { match: (p) => p.startsWith("/dashboard/barbers"), title: "Barbers" },
  { match: (p) => p.startsWith("/dashboard/services"), title: "Services" },
  { match: (p) => p.startsWith("/dashboard/settings"), title: "Settings" },
];

export function AdminTopbar({
  shopName,
  services,
  barbers,
}: {
  shopName: string;
  services: Option[];
  barbers: Option[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title = TITLES.find((t) => t.match(pathname))?.title ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AdminSidebar shopName={shopName} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
      </div>

      <WalkInDialog services={services} barbers={barbers} />
    </header>
  );
}
