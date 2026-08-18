export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type AppointmentStatus =
  | "Confirmed"
  | "Completed"
  | "Cancelled"
  | "NoShow";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "Confirmed",
  "Completed",
  "Cancelled",
  "NoShow",
];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  Confirmed: "Confirmed",
  Completed: "Completed",
  Cancelled: "Cancelled",
  NoShow: "No-show",
};

// Tailwind classes for status badges (kept subtle / professional).
export const STATUS_BADGE: Record<AppointmentStatus, string> = {
  Confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
  NoShow: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
};

export const NOTIFICATION_TYPES = {
  BookingConfirmation: "BookingConfirmation",
  Reminder24h: "Reminder24h",
  Reminder2h: "Reminder2h",
  Cancellation: "Cancellation",
  Reschedule: "Reschedule",
  Completed: "Completed",
  NoShow: "NoShow",
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

export const NOTIFICATION_LABEL: Record<NotificationType, string> = {
  BookingConfirmation: "Booking confirmation",
  Reminder24h: "24-hour reminder",
  Reminder2h: "2-hour reminder",
  Cancellation: "Cancellation notice",
  Reschedule: "Reschedule notice",
  Completed: "Visit completed",
  NoShow: "No-show notice",
};

export const ANY_BARBER = "any";
