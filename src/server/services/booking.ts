import { DateTime } from "luxon";
import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_SCHEDULE: Record<string, [string, string][]> = {
  "1": [["09:00", "18:00"]], "2": [["09:00", "18:00"]], "3": [["09:00", "18:00"]],
  "4": [["09:00", "18:00"]], "5": [["09:00", "18:00"]], "6": [["09:00", "18:00"]], "7": []
};

export function defaultWeeklySchedule() { return DEFAULT_SCHEDULE; }

function asSchedule(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_SCHEDULE;
  return value as unknown as Record<string, [string, string][]>;
}

export function localRangeForBooking(input: { date: string; timezone: string; weekday: number; schedule: Prisma.JsonValue | null; durationMinutes: number; bufferMinutes: number }) {
  const schedule = asSchedule(input.schedule);
  const windows = schedule[String(input.weekday)] ?? [];
  const slots: { startAt: string; endAt: string; label: string }[] = [];
  for (const [from, to] of windows) {
    let cursor = DateTime.fromISO(`${input.date}T${from}`, { zone: input.timezone });
    const windowEnd = DateTime.fromISO(`${input.date}T${to}`, { zone: input.timezone });
    while (cursor.plus({ minutes: input.durationMinutes }) <= windowEnd) {
      const end = cursor.plus({ minutes: input.durationMinutes });
      slots.push({ startAt: cursor.toUTC().toISO()!, endAt: end.toUTC().toISO()!, label: cursor.toFormat("HH:mm") });
      cursor = end.plus({ minutes: input.bufferMinutes });
    }
  }
  return slots;
}

export async function bookingConflicts(tx: Prisma.TransactionClient, input: { businessId: string; resourceId: string; startAt: Date; endAt: Date }) {
  const [booking, block] = await Promise.all([
    tx.booking.findFirst({ where: { businessId: input.businessId, resourceId: input.resourceId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: input.endAt }, endAt: { gt: input.startAt } }, select: { id: true } }),
    tx.bookingBlock.findFirst({ where: { businessId: input.businessId, resourceId: input.resourceId, startAt: { lt: input.endAt }, endAt: { gt: input.startAt } }, select: { id: true } })
  ]);
  return Boolean(booking || block);
}

/** Owner-chosen WhatsApp number that receives new-booking alerts (BusinessSettings.notificationSettings.bookingWhatsapp). */
export function bookingAlertNumber(notificationSettings: Prisma.JsonValue | null | undefined) {
  if (!notificationSettings || typeof notificationSettings !== "object" || Array.isArray(notificationSettings)) return null;
  const value = (notificationSettings as Record<string, unknown>).bookingWhatsapp;
  return typeof value === "string" && value ? value : null;
}

/** True when the database rejected a booking because another one won the same slot (exclusion constraint or serialization failure). */
export function isBookingCollision(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "P2034" || code === "23P01" || code === "40001") return true;
  const message = error instanceof Error ? error.message : "";
  return /booking_no_overlap|23P01|40001|could not serialize/i.test(message);
}
