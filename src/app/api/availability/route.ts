import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const barberId = searchParams.get("barberId") ?? "any";
  const date = searchParams.get("date");
  const ignoreAppointmentId = searchParams.get("ignore") ?? undefined;

  if (!serviceId || !date) {
    return NextResponse.json({ error: "Missing serviceId or date" }, { status: 400 });
  }

  try {
    const slots = await getAvailability({ serviceId, barberId, dateStr: date, ignoreAppointmentId });
    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}
