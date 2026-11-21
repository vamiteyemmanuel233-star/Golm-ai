import { describe, expect, it } from 'vitest';
import { buildBaseline, clampPercent, goalImpact, monthsToReach, simulate } from './simulator';
import { tx } from './testUtils';

describe('simulate', () => {
  it('matches the brief: GH₵500 food cut by 20% saves GH₵100/month and GH₵1,200 over 12 months', () => {
    const r = simulate({ rows: [{ category: 'Food & Groceries', monthly: 50000, percent: 20 }], extraIncome: 0, horizonMonths: 12 });
    expect(r.rows[0]?.saving).toBe(10000);
    expect(r.rows[0]?.newMonthly).toBe(40000);
    expect(r.monthlySaving).toBe(10000);
    expect(r.total).toBe(120000);
    expect(r.series).toHaveLength(12);
    expect(r.series[11]).toEqual({ month: 12, cumulative: 120000 });
  });

  it('adds several cuts and extra income', () => {
    const r = simulate({
      rows: [
        { category: 'Transport', monthly: 30000, percent: 10 },
        { category: 'Entertainment', monthly: 20000, percent: 50 },
        { category: 'Shopping', monthly: 15000, percent: 0 },
      ],
      extraIncome: 25000,
      horizonMonths: 6,
    });
    expect(r.monthlyFromCuts).toBe(13000); // 30 + 100 cedis
    expect(r.monthlySaving).toBe(38000);
    expect(r.total).toBe(228000);
  });

  it('rounds to whole pesewas and clamps bad input', () => {
    expect(simulate({ rows: [{ category: 'X', monthly: 333, percent: 33 }], extraIncome: 0, horizonMonths: 1 }).rows[0]?.saving).toBe(110);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(simulate({ rows: [], extraIncome: -100, horizonMonths: 0 }).series).toHaveLength(1);
  });
});

describe('goal impact', () => {
  it('shows how many months sooner a goal is reached', () => {
    expect(monthsToReach(120000, 10000)).toBe(12);
    expect(monthsToReach(0, 0)).toBe(0);
    expect(monthsToReach(100, 0)).toBeNull();
    // GH₵3,000 to go, surplus GH₵500 → 6 months; +GH₵250 → 4 months → 2 sooner
    expect(goalImpact(300000, 50000, 25000)).toEqual({ remaining: 300000, before: 6, after: 4, sooner: 2 });
    // no surplus: before is never, after depends only on the scenario
    expect(goalImpact(300000, -1000, 30000)).toEqual({ remaining: 300000, before: null, after: 10, sooner: null });
  });
});

describe('buildBaseline', () => {
  const today = '2026-11-20';
  it('uses averages of complete months when available', () => {
    const data = ['2026-09', '2026-10'].flatMap((m) => [tx('income', 1000, 'Salary', `${m}-01`), tx('expense', 500, 'Food & Groceries', `${m}-03`)]);
    const b = buildBaseline(data, today);
    expect(b.source).toBe('average');
    expect(b.rows[0]).toEqual({ category: 'Food & Groceries', monthly: 50000, flexible: true });
    expect(b.surplus).toBe(50000);
  });
  it('falls back to the current month, then to nothing', () => {
    expect(buildBaseline([tx('expense', 80, 'Transport', '2026-11-02')], today).source).toBe('current');
    expect(buildBaseline([], today).source).toBe('none');
  });
});
