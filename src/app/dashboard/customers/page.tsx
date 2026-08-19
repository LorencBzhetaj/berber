export const dynamic = "force-dynamic";

import { getCustomers, getSettings } from "@/server/data";
import { CustomerTable } from "@/components/admin/customer-table";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const [customers, settings] = await Promise.all([getCustomers(), getSettings()]);
  return <CustomerTable customers={customers} currency={settings.currency} />;
}
