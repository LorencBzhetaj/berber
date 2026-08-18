import { z } from "zod";

export const customerDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z.string().trim().min(6, "A valid phone number is required").max(30),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CustomerDetailsInput = z.infer<typeof customerDetailsSchema>;

export const createBookingSchema = customerDetailsSchema.extend({
  serviceId: z.string().min(1, "Select a service"),
  barberId: z.string().min(1, "Select a barber"),
  start: z.string().datetime().or(z.string().min(1)),
});

export const walkInSchema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  customerId: z.string().optional(),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z.string().trim().min(6, "Phone is required").max(30),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  start: z.string().min(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(300),
  price: z.coerce.number().min(0).max(10000),
  isActive: z.boolean().default(true),
});

export const barberProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  displayName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const workingHourSchema = z.object({
  barberId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const dayOffSchema = z.object({
  barberId: z.string().min(1),
  date: z.string().min(1),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const vacationSchema = z.object({
  barberId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const settingsSchema = z.object({
  shopName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().max(120).optional().or(z.literal("")),
  currency: z.string().trim().min(1).max(8),
  bookingInterval: z.coerce.number().int().min(5).max(120),
  cancellationHours: z.coerce.number().int().min(0).max(168),
});
