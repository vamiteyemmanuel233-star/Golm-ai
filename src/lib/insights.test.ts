import { describe, expect, it } from 'vitest';
import { buildRecommendations, detectUnusualExpenses, median, projectedMonthSpending } from './insights';
import { monthlyTotals } from './finance';
import { tx } from './testUtils';

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('detectUnusualExpenses', () => {
  const normal = [100, 110, 90, 105, 95].map((c, i) => tx('expense', c, 'Transport', `2026-10-0${i + 1}`));

  it('flags a clear outlier and explains why', () => {
    const outlier = tx('expense', 650, 'Transport', '2026-11-02', 'Airport taxi');
    const result = detectUnusualExpenses([...normal, outlier]);
    expect(result).toHaveLength(1);
    expect(result[0]?.transaction.id).toBe(outlier.id);
    expect(result[0]?.reason).toContain('Transport');
    expect(result[0]?.score ?? 0).toBeGreaterThan(3.5);
  });

  it('does not flag ordinary variation', () => {
    expect(detectUnusualExpenses([...normal, tx('expense', 120, 'Transport', '2026-11-02')])).toHaveLength(0);
  });

  it('needs enough history before judging a category', () => {
    const few = [tx('expense', 100, 'Health', '2026-10-01'), tx('expense', 900, 'Health', '2026-10-02')];
    expect(detectUnusualExpenses(few)).toHaveLength(0);
  });

  it('uses the 2× rule when all past amounts are identical', () => {
    const same = [1, 2, 3, 4, 5].map((d) => tx('expense', 50, 'Mobile Data & Airtime', `2026-10-0${d}`));
    const big = tx('expense', 150, 'Mobile Data & Airtime', '2026-11-01');
    const result = detectUnusualExpenses([...same, big]);
    expect(result).toHaveLength(1);
    expect(result[0]?.score).toBeNull();
  });

  it('can be limited to one month and ignores income', () => {
    const outlier = tx('expense', 650, 'Transport', '2026-11-02');
    expect(detectUnusualExpenses([...normal, outlier], { month: '2026-10' })).toHaveLength(0);
    const incomes = [1, 2, 3, 4, 5, 6].map((d) => tx('income', d === 6 ? 99999 : 100, 'Salary', `2026-10-0${d}`));
    expect(detectUnusualExpenses(incomes)).toHaveLength(0);
  });
});

describe('projectedMonthSpending', () => {
  it('projects the current month from the daily pace', () => {
    // 300 spent in 10 of 30 days → 900
    expect(projectedMonthSpending(30000, '2026-11', '2026-11-10')).toEqual({ value: 90000, isProjection: true });
  });
  it('does not project past months', () => {
    expect(projectedMonthSpending(30000, '2026-10', '2026-11-10')).toEqual({ value: 30000, isProjection: false });
  });
});

describe('buildRecommendations', () => {
  const history = [
    tx('income', 5000, 'Salary', '2026-08-01'), tx('expense', 2000, 'Rent & Housing', '2026-08-02'),
    tx('income', 5000, 'Salary', '2026-09-01'), tx('expense', 2000, 'Rent & Housing', '2026-09-02'),
    tx('income', 5000, 'Salary', '2026-10-01'), tx('expense', 2000, 'Rent & Housing', '2026-10-02'),
  ];
  const previous = monthlyTotals(history, ['2026-08', '2026-09', '2026-10']);

  it('reports over-budget categories as critical, first', () => {
    const transactions = [...history, tx('income', 5000, 'Salary', '2026-11-01'), tx('expense', 600, 'Food & Groceries', '2026-11-03')];
    const recs = buildRecommendations({
      transactions,
      budgets: [{ category: 'Food & Groceries', limit: 50000, isDemo: false }],
      month: '2026-11',
      today: '2026-11-30',
      previousMonths: previous,
      unusual: [],
    });
    expect(recs[0]?.id).toBe('over-Food & Groceries');
    expect(recs[0]?.severity).toBe('critical');
    expect(recs.some((r) => r.id === 'trend-down')).toBe(true); // 600 vs avg 2000
  });

  it('flags spending above income', () => {
    const transactions = [tx('income', 1000, 'Salary', '2026-11-01'), tx('expense', 1500, 'Shopping', '2026-11-02')];
    const recs = buildRecommendations({ transactions, budgets: [], month: '2026-11', today: '2026-11-30', previousMonths: [], unusual: [] });
    expect(recs.some((r) => r.id === 'overspending' && r.severity === 'critical')).toBe(true);
    expect(recs.some((r) => r.id === 'no-budgets')).toBe(true);
    expect(recs.some((r) => r.id === 'concentration')).toBe(true); // Shopping = 100%
  });

  it('explains the basis of every recommendation', () => {
    const transactions = [...history, tx('income', 5000, 'Salary', '2026-11-01'), tx('expense', 4000, 'Rent & Housing', '2026-11-02')];
    const recs = buildRecommendations({ transactions, budgets: [], month: '2026-11', today: '2026-11-30', previousMonths: previous, unusual: [] });
    expect(recs.every((r) => r.basis.length > 0)).toBe(true);
    expect(recs.some((r) => r.id === 'trend-up')).toBe(true);
  });

  it('returns a single helpful message when the month is empty', () => {
    const recs = buildRecommendations({ transactions: history, budgets: [], month: '2026-12', today: '2026-12-05', previousMonths: previous, unusual: [] });
    expect(recs).toHaveLength(1);
    expect(recs[0]?.id).toBe('no-data');
  });
});
