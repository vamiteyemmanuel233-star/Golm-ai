import { describe, expect, it } from 'vitest';
import {
  methodBreakdown,
  budgetUtilization,
  categoryBreakdown,
  EMPTY_FILTER,
  filterTransactions,
  monthlyTotals,
  monthsWithData,
  summarize,
  totalBudgetUtilization,
} from './finance';
import { tx } from './testUtils';

const data = [
  tx('income', 5000, 'Salary', '2026-10-01', 'October pay'),
  tx('expense', 1500, 'Rent & Housing', '2026-10-02', 'Rent'),
  tx('expense', 300.5, 'Food & Groceries', '2026-10-10', 'Market'),
  tx('income', 5000, 'Salary', '2026-11-01', 'November pay'),
  tx('expense', 1500, 'Rent & Housing', '2026-11-02', 'Rent'),
  tx('expense', 200.25, 'Food & Groceries', '2026-11-05', 'Supermarket'),
  tx('expense', 100, 'Transport', '2026-11-06', 'Trotro'),
];

describe('summarize', () => {
  it('totals a single month correctly', () => {
    const s = summarize(data, '2026-11');
    expect(s.income).toBe(500000);
    expect(s.expenses).toBe(180025);
    expect(s.net).toBe(319975);
    expect(s.savingsRate).toBeCloseTo(0.63995, 5);
    expect(s.transactionCount).toBe(4);
  });

  it('totals all time when no month is given', () => {
    const s = summarize(data);
    expect(s.income).toBe(1000000);
    expect(s.expenses).toBe(360075);
  });

  it('returns a null savings rate without income', () => {
    expect(summarize([tx('expense', 10, 'Transport', '2026-11-01')]).savingsRate).toBeNull();
    expect(summarize([]).net).toBe(0);
  });
});

describe('monthlyTotals', () => {
  it('fills months without data with zeros', () => {
    const totals = monthlyTotals(data, ['2026-09', '2026-10', '2026-11']);
    expect(totals[0]).toEqual({ month: '2026-09', income: 0, expenses: 0, net: 0 });
    expect(totals[1]).toEqual({ month: '2026-10', income: 500000, expenses: 180050, net: 319950 });
    expect(totals[2]?.expenses).toBe(180025);
  });
});

describe('categoryBreakdown', () => {
  it('sorts categories by total and computes shares that sum to 1', () => {
    const cats = categoryBreakdown(data, 'expense', '2026-11');
    expect(cats.map((c) => c.category)).toEqual(['Rent & Housing', 'Food & Groceries', 'Transport']);
    const shareSum = cats.reduce((s, c) => s + c.share, 0);
    expect(shareSum).toBeCloseTo(1, 10);
    expect(cats[0]?.total).toBe(150000);
  });
});

describe('budgetUtilization', () => {
  it('computes spent, remaining, ratio and state', () => {
    const statuses = budgetUtilization(
      data,
      [
        { category: 'Food & Groceries', limit: 20000, isDemo: false },
        { category: 'Transport', limit: 11000, isDemo: false },
        { category: 'Shopping', limit: 50000, isDemo: false },
      ],
      '2026-11',
    );
    const food = statuses.find((s) => s.category === 'Food & Groceries');
    const transport = statuses.find((s) => s.category === 'Transport');
    const shopping = statuses.find((s) => s.category === 'Shopping');
    expect(food?.state).toBe('over');
    expect(food?.remaining).toBe(-25);
    expect(transport?.state).toBe('warning'); // 100/110 = 90.9%
    expect(shopping?.state).toBe('ok');
    expect(shopping?.spent).toBe(0);
    expect(statuses[0]?.category).toBe('Food & Groceries'); // most used first

    const total = totalBudgetUtilization(statuses);
    expect(total.limit).toBe(81000);
    expect(total.spent).toBe(30025);
  });

  it('treats exactly 100% as a warning, not over', () => {
    const [s] = budgetUtilization([tx('expense', 100, 'Transport', '2026-11-01')], [{ category: 'Transport', limit: 10000, isDemo: false }], '2026-11');
    expect(s?.state).toBe('warning');
  });
});

describe('filterTransactions', () => {
  it('returns all, newest first, with an empty filter', () => {
    const result = filterTransactions(data, EMPTY_FILTER);
    expect(result).toHaveLength(data.length);
    expect(result[0]?.date).toBe('2026-11-06');
  });

  it('filters by search, type, category and date range', () => {
    expect(filterTransactions(data, { ...EMPTY_FILTER, search: 'MARKET' })).toHaveLength(2) // "Market" and "Supermarket";
    expect(filterTransactions(data, { ...EMPTY_FILTER, search: 'rent' })).toHaveLength(2);
    expect(filterTransactions(data, { ...EMPTY_FILTER, type: 'income' })).toHaveLength(2);
    expect(filterTransactions(data, { ...EMPTY_FILTER, category: 'Transport' })).toHaveLength(1);
    expect(filterTransactions(data, { ...EMPTY_FILTER, from: '2026-11-02', to: '2026-11-05' })).toHaveLength(2);
  });

  it('lists months with data', () => {
    expect(monthsWithData(data)).toEqual(['2026-10', '2026-11']);
  });
});

describe('methodBreakdown', () => {
  it('totals by payment method and labels older records as unrecorded', () => {
    const rows = methodBreakdown(
      [
        { ...tx('expense', 100, 'Transport', '2026-11-01'), method: 'momo' },
        { ...tx('expense', 50, 'Transport', '2026-11-02'), method: 'momo' },
        { ...tx('expense', 50, 'Food & Groceries', '2026-11-03'), method: 'cash' },
        tx('expense', 100, 'Shopping', '2026-11-04'),
        { ...tx('income', 999, 'Salary', '2026-11-01'), method: 'bank' },
      ],
      'expense',
      '2026-11',
    );
    expect(rows.map((r) => r.method)).toEqual(['momo', 'unrecorded', 'cash']);
    expect(rows[0]?.total).toBe(15000);
    expect(rows[0]?.share).toBeCloseTo(0.5, 10);
  });

  it('filters transactions by payment method', () => {
    const list = [{ ...tx('expense', 1, 'Transport', '2026-11-01'), method: 'momo' as const }, tx('expense', 1, 'Transport', '2026-11-01')];
    expect(filterTransactions(list, { ...EMPTY_FILTER, method: 'momo' })).toHaveLength(1);
  });
});
