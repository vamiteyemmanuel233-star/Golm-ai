import type { MonthKey } from '../types/finance';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number): string => String(n).padStart(2, '0');

/** Formats a Date as YYYY-MM-DD in the user's local time zone. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Strict check: "2026-02-30" is rejected because February has no 30th. */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthKeyOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

function parseMonth(key: MonthKey): { year: number; month: number } {
  const [year = 1970, month = 1] = key.split('-').map(Number);
  return { year, month };
}

/** addMonths("2026-11", 2) → "2027-01" */
export function addMonths(key: MonthKey, count: number): MonthKey {
  const { year, month } = parseMonth(key);
  const total = year * 12 + (month - 1) + count;
  const newYear = Math.floor(total / 12);
  const newMonth = total - newYear * 12 + 1;
  return `${newYear}-${pad(newMonth)}`;
}

/** The `count` months ending with `endKey`, oldest first. */
export function lastNMonths(endKey: MonthKey, count: number): MonthKey[] {
  const months: MonthKey[] = [];
  for (let i = count - 1; i >= 0; i -= 1) months.push(addMonths(endKey, -i));
  return months;
}

export function monthLabel(key: MonthKey, style: 'short' | 'long' = 'short'): string {
  const { year, month } = parseMonth(key);
  const names = style === 'short' ? SHORT_MONTHS : LONG_MONTHS;
  return `${names[month - 1] ?? '?'} ${year}`;
}

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonth(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "2026-11-05" → "5 Nov 2026" */
export function formatDisplayDate(isoDate: string): string {
  if (!isValidISODate(isoDate)) return isoDate;
  const [y = 0, m = 1, d = 1] = isoDate.split('-').map(Number);
  return `${d} ${SHORT_MONTHS[m - 1] ?? ''} ${y}`;
}
