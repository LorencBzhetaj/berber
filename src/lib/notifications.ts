import { prisma } from "./prisma";
import { NotificationType } from "./constants";
import { formatDateLong, formatTime } from "./format";

/**
 * MOCK / DEMO notification service.
 * -------------------------------------------------------------
 * This does NOT call the real WhatsApp API. It records a simulated
 * notification in the database and reports it as "Sent" so the demo
 * can show realistic WhatsApp confirmation / reminder activity.
 *
 * In production, swap the body of `deliver()` for a real provider
 * (WhatsApp Cloud API, Twilio, etc.) behind the same interface.
 */

interface NotificationContext {
  customerName: string;
  shopName: string;
  barberName: string;
  serviceName: string;
  start: Date;
}

function buildMessage(type: NotificationType, ctx: NotificationContext): string {
  const when = `${formatDateLong(ctx.start)} at ${formatTime(ctx.start)}`;
  const first = ctx.customerName.split(" ")[0];
  switch (type) {
    case "BookingConfirmation":
      return `Hi ${first}! Your ${ctx.serviceName} with ${ctx.barberName} at ${ctx.shopName} is confirmed for ${when}. See you soon! 💈`;
    case "Reminder24h":
      return `Reminder: your ${ctx.serviceName} with ${ctx.barberName} at ${ctx.shopName} is tomorrow, ${when}.`;
    case "Reminder2h":
      return `See you in 2 hours, ${first}! Your ${ctx.serviceName} with ${ctx.barberName} is at ${formatTime(ctx.start)}.`;
    case "Cancellation":
      return `Hi ${first}, your appointment on ${when} at ${ctx.shopName} has been cancelled. Feel free to rebook anytime.`;
    case "Reschedule":
      return `Hi ${first}, your appointment has been rescheduled to ${when} with ${ctx.barberName} at ${ctx.shopName}.`;
    case "Completed":
      return `Thanks for visiting ${ctx.shopName}, ${first}! We hope you love your ${ctx.serviceName}. See you next time. 💈`;
    case "NoShow":
      return `Hi ${first}, we missed you for your ${ctx.serviceName} on ${when}. Get in touch to rebook.`;
  }
}

/** Simulate delivery of a notification for an appointment and persist it. */
export async function sendNotification(appointmentId: string, type: NotificationType) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, barber: true, service: true },
  });
  if (!appointment) return null;

  const settings = await prisma.shopSetting.findFirst();
  const recipient =
    appointment.customer.whatsappNumber || appointment.customer.phone || "";

  const message = buildMessage(type, {
    customerName: `${appointment.customer.firstName} ${appointment.customer.lastName}`,
    shopName: settings?.shopName ?? "Barber House",
    barberName: appointment.barber.displayName,
    serviceName: appointment.service.name,
    start: new Date(appointment.startDateTime),
  });

  // In the demo, delivery always "succeeds".
  return prisma.notification.create({
    data: {
      appointmentId,
      type,
      channel: "WhatsApp",
      status: "Sent",
      message,
      recipient,
    },
  });
}
