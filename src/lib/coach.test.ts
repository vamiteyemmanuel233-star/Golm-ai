import { describe, expect, it } from 'vitest';
import type { SavingsGoal } from '../types/finance';
import {
  analyzeSpending,
  buildSavingsPlan,
  categoryAverages,
  checkGoal,
  checkGoalByDate,
  endOfMonth,
  goalsAnswer,
  monthlyAverages,
  planAnswer,
  reduceAnswer,
  suggestReduction,
} from './coach';
import { generateDemoData } from './demoData';
import { tx } from './testUtils';

const today = '2026-11-20';
// Three complete months (Aug–Oct) with identical figures, plus a partial November.
const history = ['2026-08', '2026-09', '2026-10'].flatMap((m) => [
  tx('income', 3000, 'Salary', `${m}-01`),
  tx('expense', 1000, 'Rent & Housing', `${m}-02`),
  tx('expense', 500, 'Food & Groceries', `${m}-05`),
  tx('expense', 300, 'Transport', `${m}-06`),
  tx('expense', 200, 'Entertainment', `${m}-07`),
]);
const data = [...history, tx('expense', 9999, 'Shopping', '2026-11-03')]; // in-progress month is ignored
const goal = (over: Partial<SavingsGoal>): SavingsGoal => ({
  id: 'g', name: 'School fees', target: 300000, saved: 0, deadline: '2027-05-20', isDemo: false, createdAt: 'x', updatedAt: 'x', ...over,
});

describe('monthlyAverages', () => {
  it('averages complete months only', () => {
    const a = monthlyAverages(data, today);
    expect(a?.months.map((m) => m.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(a?.income).toBe(300000);
    expect(a?.expenses).toBe(200000);
    expect(a?.surplus).toBe(100000);
  });
  it('returns null without complete-month history', () => {
    expect(monthlyAverages([tx('expense', 5, 'Transport', '2026-11-02')], today)).toBeNull();
  });
});

describe('categoryAverages and suggestReduction', () => {
  it('marks essential vs flexible categories', () => {
    const c = categoryAverages(data, ['2026-08', '2026-09', '2026-10']);
    expect(c[0]).toEqual({ category: 'Rent & Housing', monthly: 100000, flexible: false });
    expect(c.find((x) => x.category === 'Food & Groceries')?.flexible).toBe(true);
  });

  it('suggests the largest flexible category, never rent', () => {
    const s = suggestReduction(data, [], today);
    expect(s?.category).toBe('Food & Groceries');
    expect(s?.save10).toBe(5000); // 10% of GH₵500
    expect(s?.save20).toBe(10000); // 20% of GH₵500
  });

  it('prefers a flexible category that is over budget this month', () => {
    const withNov = [...data, tx('expense', 250, 'Transport', '2026-11-04')];
    const s = suggestReduction(withNov, [{ category: 'Transport', limit: 20000, isDemo: false }], today);
    expect(s?.category).toBe('Transport');
    expect(s?.reason).toContain('over budget');
  });
});

describe('checkGoal', () => {
  it('classifies by the share of the average surplus needed', () => {
    // GH₵3,000 over 6 months = GH₵500/month vs GH₵1,000 surplus → 50% → on track
    expect(checkGoal(goal({}), 100000, today).status).toBe('on-track');
    // GH₵3,000 by mid-Feb (2 months) = GH₵1,500/month > surplus → not feasible
    const tight = checkGoalByDate(goal({}), '2027-01-25', 100000, today);
    expect(tight.needed).toBe(150000);
    expect(tight.status).toBe('not-feasible');
    expect(tight.summary).toContain('Not achievable');
    // GH₵3,000 over 4 months = GH₵750 → 75% → stretch
    expect(checkGoalByDate(goal({}), '2027-03-20', 100000, today).status).toBe('stretch');
  });

  it('handles reached, open-ended and no-surplus cases', () => {
    expect(checkGoal(goal({ saved: 300000 }), 100000, today).status).toBe('reached');
    const open = checkGoal(goal({ deadline: null }), 100000, today);
    expect(open.status).toBe('no-deadline');
    expect(open.monthsAtSurplus).toBe(3);
    expect(checkGoal(goal({}), -5000, today).status).toBe('no-surplus');
    expect(checkGoal(goal({}), null, today).status).toBe('no-surplus');
  });

  it('computes the last day of a month for "by December" checks', () => {
    expect(endOfMonth('2026-12')).toBe('2026-12-31');
    expect(endOfMonth('2027-02')).toBe('2027-02-28');
  });
});

describe('buildSavingsPlan', () => {
  it('targets 20% of income and proposes capped cuts to close the gap', () => {
    // income 3,000 → target 600; surplus 1,000 → no gap
    expect(buildSavingsPlan(data, [], today)?.gap).toBe(0);
    // Raise spending: surplus 300 → gap 300
    const tighter = [...data, ...['2026-08', '2026-09', '2026-10'].map((m) => tx('expense', 700, 'Shopping', `${m}-15`))];
    const p = buildSavingsPlan(tighter, [], today);
    expect(p?.target).toBe(60000);
    expect(p?.surplus).toBe(30000);
    expect(p?.gap).toBe(30000);
    // Shopping 700 → cut max 20% = 140; Food 500 → 100; Transport 300 → 60 (total 300)
    expect(p?.cuts).toEqual([
      { category: 'Shopping', monthly: 70000, cut: 14000 },
      { category: 'Food & Groceries', monthly: 50000, cut: 10000 },
      { category: 'Transport', monthly: 30000, cut: 6000 },
    ]);
    expect(p?.cutTotal).toBe(30000);
  });

  it('includes what dated goals need per month', () => {
    expect(buildSavingsPlan(data, [goal({})], today)?.goalNeeds).toBe(50000);
  });
});

describe('coach text answers', () => {
  const demo = generateDemoData(today);
  const inputs = { transactions: demo.transactions, budgets: demo.budgets, goals: demo.goals, month: '2026-11', today };

  it('answers every coach question from the data', () => {
    expect(analyzeSpending(inputs)).toContain('Largest categories');
    expect(reduceAnswer(inputs)).toContain('Cutting it by 20%');
    expect(planAnswer(inputs)).toContain('20% of income');
    expect(goalsAnswer(inputs)).toContain('School fees');
  });

  it('explains when there is not enough data', () => {
    const empty = { transactions: [], budgets: [], goals: [], month: '2026-11', today };
    expect(analyzeSpending(empty)).toContain('no complete months');
    expect(planAnswer(empty)).toContain('at least one complete month');
    expect(goalsAnswer(empty)).toContain('no savings goals');
  });
});
