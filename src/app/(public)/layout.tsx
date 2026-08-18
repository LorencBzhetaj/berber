import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getSettings } from "@/lib/settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader shopName={settings.shopName} />
      <main className="flex-1">{children}</main>
      <SiteFooter
        shopName={settings.shopName}
        phone={settings.phone}
        address={settings.address}
        email={settings.email}
      />
    </div>
  );
}
