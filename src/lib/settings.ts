import { prisma } from "./prisma";

export const DEFAULT_SETTINGS = {
  shopName: "Barber House",
  phone: "+355 69 123 4567",
  whatsapp: "+355 69 123 4567",
  address: "Rruga Myslym Shyri 21, Tirana, Albania",
  email: "hello@barberhouse.al",
  currency: "EUR",
  bookingInterval: 30,
  cancellationHours: 2,
  timezone: "Europe/Tirane",
};

/** Always returns a settings object (creates defaults on first run). */
export async function getSettings() {
  let settings = await prisma.shopSetting.findFirst();
  if (!settings) {
    settings = await prisma.shopSetting.create({ data: DEFAULT_SETTINGS });
  }
  return settings;
}
