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
