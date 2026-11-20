import { describe, expect, it } from 'vitest';
import { addMonths, daysInMonth, formatDisplayDate, isValidISODate, lastNMonths, monthLabel } from './dates';

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isValidISODate('2026-11-20')).toBe(true);
    expect(isValidISODate('2024-02-29')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('20-11-2026')).toBe(false);
  });

  it('adds months across year boundaries', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-03', -14)).toBe('2025-01');
  });

  it('lists the last N months oldest first', () => {
    expect(lastNMonths('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('labels and measures months', () => {
    expect(monthLabel('2026-11')).toBe('Nov 2026');
    expect(monthLabel('2026-11', 'long')).toBe('November 2026');
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(formatDisplayDate('2026-11-05')).toBe('5 Nov 2026');
  });
});
