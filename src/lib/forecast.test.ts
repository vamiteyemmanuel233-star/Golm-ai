import { describe, expect, it } from 'vitest';
import { forecastByCategory, forecastHistoryEnd, forecastNextMonth, linearTrend, weightedMovingAverage } from './forecast';
import type { MonthTotal } from './finance';
import { tx } from './testUtils';

const month = (m: string, expenses: number): MonthTotal => ({ month: m, income: 0, expenses, net: -expenses });

describe('weightedMovingAverage', () => {
  it('weights newer values more heavily (1, 2, 3)', () => {
    // (100×1 + 200×2 + 300×3) ÷ 6 = 233.33…
    expect(weightedMovingAverage([100, 200, 300])).toBeCloseTo(233.333, 3);
  });
  it('supports custom weights and handles empty input', () => {
    expect(weightedMovingAverage([10, 20], [1, 1])).toBe(15);
    expect(weightedMovingAverage([])).toBe(0);
    expect(() => weightedMovingAverage([1, 2], [1])).toThrow();
  });
});

describe('linearTrend', () => {
  it('fits a straight line and projects the next value', () => {
    const t = linearTrend([100, 200, 300, 400]);
    expect(t?.slope).toBeCloseTo(100, 10);
    expect(t?.next).toBeCloseTo(500, 10);
  });
  it('needs at least three points', () => {
    expect(linearTrend([1, 2])).toBeNull();
  });
  it('gives zero slope for flat data', () => {
    expect(linearTrend([50, 50, 50])?.slope).toBe(0);
  });
});

describe('forecastNextMonth', () => {
  it('uses the last three months with a 1-2-3 weighting', () => {
    const f = forecastNextMonth([
      month('2026-06', 90000),
      month('2026-07', 100000),
      month('2026-08', 120000),
      month('2026-09', 110000),
    ]);
    // (100000×1 + 120000×2 + 110000×3) ÷ 6 = 111666.67 → 111667
    expect(f?.value).toBe(111667);
    expect(f?.monthsUsed).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(f?.low).toBe(100000);
    expect(f?.high).toBe(120000);
    expect(f?.trendValue).not.toBeNull();
  });

  it('ignores empty months before tracking started', () => {
    const f = forecastNextMonth([month('2026-07', 0), month('2026-08', 0), month('2026-09', 60000)]);
    expect(f?.value).toBe(60000);
    expect(f?.monthsUsed).toEqual(['2026-09']);
    expect(f?.trendValue).toBeNull();
  });

  it('returns null without any spending history', () => {
    expect(forecastNextMonth([month('2026-09', 0)])).toBeNull();
    expect(forecastNextMonth([])).toBeNull();
  });

  it('never projects a negative trend', () => {
    const f = forecastNextMonth([month('2026-07', 300000), month('2026-08', 100000), month('2026-09', 1000)]);
    expect(f?.trendValue).toBe(0);
  });
});

describe('forecastHistoryEnd', () => {
  it('excludes the month in progress', () => {
    expect(forecastHistoryEnd('2026-11', '2026-11-20')).toBe('2026-10');
    expect(forecastHistoryEnd('2026-09', '2026-11-20')).toBe('2026-09');
  });
});

describe('forecastByCategory', () => {
  it('applies the weighted average per category', () => {
    const result = forecastByCategory(
      [
        tx('expense', 100, 'Transport', '2026-08-03'),
        tx('expense', 200, 'Transport', '2026-09-03'),
        tx('expense', 300, 'Transport', '2026-10-03'),
        tx('expense', 60, 'Health', '2026-10-09'),
        tx('income', 999, 'Salary', '2026-10-01'),
      ],
      ['2026-08', '2026-09', '2026-10'],
    );
    expect(result[0]).toEqual({ category: 'Transport', value: 23333 });
    expect(result[1]).toEqual({ category: 'Health', value: 3000 }); // 6000×3 ÷ 6
    expect(result).toHaveLength(2);
  });
});
