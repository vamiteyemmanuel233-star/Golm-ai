import { describe, expect, it } from 'vitest';
import { generateDemoData } from './demoData';
import { detectUnusualExpenses } from './insights';
import { budgetUtilization } from './finance';
import { isBudget, isSavingsGoal, isTransaction } from './storage';

describe('generateDemoData', () => {
  const today = '2026-11-20';
  const demo = generateDemoData(today);

  it('marks every record as demonstration data', () => {
    expect(demo.transactions.length).toBeGreaterThan(100);
    expect(demo.transactions.every((t) => t.isDemo)).toBe(true);
    expect(demo.budgets.every((b) => b.isDemo)).toBe(true);
    expect(demo.goals.every((g) => g.isDemo && isSavingsGoal(g))).toBe(true);
    expect(demo.transactions.every((t) => t.method !== undefined)).toBe(true);
  });

  it('produces records that pass storage validation and are never in the future', () => {
    expect(demo.transactions.every(isTransaction)).toBe(true);
    expect(demo.budgets.every(isBudget)).toBe(true);
    expect(demo.transactions.every((t) => t.date <= today)).toBe(true);
    expect(new Set(demo.transactions.map((t) => t.id)).size).toBe(demo.transactions.length);
  });

  it('is deterministic for the same date', () => {
    expect(generateDemoData(today)).toEqual(demo);
  });

  it('contains detectable insights for demonstrations', () => {
    expect(detectUnusualExpenses(demo.transactions, { month: '2026-11' }).length).toBeGreaterThan(0);
    const statuses = budgetUtilization(demo.transactions, demo.budgets, '2026-11');
    expect(statuses.some((s) => s.state === 'over')).toBe(true);
  });

  it('works early in a month and at month ends', () => {
    for (const day of ['2026-03-01', '2026-02-28', '2026-12-31']) {
      const d = generateDemoData(day);
      expect(d.transactions.every((t) => t.date <= day && isTransaction(t))).toBe(true);
    }
  });
});
