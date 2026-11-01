// Meter readings run on a rolling cycle: each meter is due one calendar month
// after the day its last reading was recorded, with a reminder a few days ahead.

export const METER_READING_REMIND_DAYS_BEFORE = 3;

export type MeterReadingDueStatus = "no_reading" | "ok" | "due_soon" | "overdue";

export interface MeterReadingDueInfo {
  status: MeterReadingDueStatus;
  nextDueAt?: string;
  daysUntilDue?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addCalendarMonths(value: Date, months: number): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + months;
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(value.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      value.getUTCMilliseconds()
    )
  );
}

function utcDayNumber(value: Date): number {
  return Math.floor(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / MS_PER_DAY
  );
}

export function getMeterReadingDueInfo(
  recordedAt: string | undefined,
  now: Date = new Date(),
  remindDaysBefore: number = METER_READING_REMIND_DAYS_BEFORE
): MeterReadingDueInfo {
  const recorded = recordedAt ? new Date(recordedAt) : null;
  if (!recorded || Number.isNaN(recorded.getTime())) {
    return { status: "no_reading" };
  }

  const nextDue = addCalendarMonths(recorded, 1);
  const daysUntilDue = utcDayNumber(nextDue) - utcDayNumber(now);
  const status: MeterReadingDueStatus =
    daysUntilDue < 0 ? "overdue" : daysUntilDue <= remindDaysBefore ? "due_soon" : "ok";

  return {
    status,
    nextDueAt: nextDue.toISOString(),
    daysUntilDue
  };
}
