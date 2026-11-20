/**
 * Spending forecasts.
 *
 * These are STATISTICAL ESTIMATES, not a trained AI model:
 *  - Primary method: weighted moving average (WMA) of recent complete months,
 *    where the most recent month counts the most.
 *      3 months [a, b, c] (oldest → newest):  forecast = (1a + 2b + 3c) ÷ 6
 *  - Comparison method: least-squares linear trend, extended one month ahead.
 */
import type { MonthKey, Transaction } from '../types/finance';
import { addMonths, monthKeyOf } from './dates';
import type { MonthTotal } from './finance';

/** Weighted average; default weights are 1, 2, …, n so newer values matter more. */
export function weightedMovingAverage(values: readonly number[], weights?: readonly number[]): number {
  if (values.length === 0) return 0;
  const w = weights ?? values.map((_, i) => i + 1);
  if (w.length !== values.length) throw new Error('weights and values must be the same length');
  const weightSum = w.reduce((s, x) => s + x, 0);
  if (weightSum <= 0) return 0;
  const total = values.reduce((s, v, i) => s + v * (w[i] ?? 0), 0);
  return total / weightSum;
}

export interface LinearTrend {
  /** change per month */
  slope: number;
  intercept: number;
  /** value projected for the next period */
  next: number;
}

/** Least-squares line through (0, v0), (1, v1)…; needs at least 3 points to be meaningful. */
export function linearTrend(values: readonly number[]): LinearTrend | null {
  const n = values.length;
  if (n < 3) return null;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let numerator = 0;
  let denominator = 0;
  values.forEach((v, x) => {
    numerator += (x - meanX) * (v - meanY);
    denominator += (x - meanX) ** 2;
  });
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  return { slope, intercept, next: intercept + slope * n };
}

export interface SpendingForecast {
  method: 'weighted-moving-average';
  /** Forecast expenses for the next month, pesewas (rounded) */
  value: number;
  monthsUsed: MonthKey[];
  weights: number[];
  /** Linear-trend projection for comparison (never below 0), or null with < 3 months */
  trendValue: number | null;
  /** Lowest and highest monthly spending in the months used */
  low: number;
  high: number;
}

/**
 * Forecasts next month's total expenses from COMPLETE months (oldest → newest).
 * Uses up to the last 3 months for the WMA and up to 6 for the trend line.
 * Returns null when there is no spending history at all.
 */
export function forecastNextMonth(history: readonly MonthTotal[]): SpendingForecast | null {
  const withSpending = history.filter((m) => m.expenses > 0);
  if (withSpending.length === 0) return null;

  // Start from the first month that has data, so empty months before the user
  // began tracking don't drag the estimate down.
  const firstIndex = history.findIndex((m) => m.expenses > 0);
  const tracked = history.slice(firstIndex);

  const recent = tracked.slice(-3);
  const values = recent.map((m) => m.expenses);
  const weights = values.map((_, i) => i + 1);
  const trend = linearTrend(tracked.slice(-6).map((m) => m.expenses));

  return {
    method: 'weighted-moving-average',
    value: Math.round(weightedMovingAverage(values, weights)),
    monthsUsed: recent.map((m) => m.month),
    weights,
    trendValue: trend ? Math.max(0, Math.round(trend.next)) : null,
    low: Math.min(...values),
    high: Math.max(...values),
  };
}

export interface CategoryForecast {
  category: string;
  value: number;
}

/** The same WMA applied to each expense category over the given months. */
export function forecastByCategory(
  transactions: readonly Transaction[],
  months: readonly MonthKey[],
): CategoryForecast[] {
  if (months.length === 0) return [];
  const index = new Map(months.map((m, i) => [m, i]));
  const perCategory = new Map<string, number[]>();
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const i = index.get(monthKeyOf(tx.date));
    if (i === undefined) continue;
    const series = perCategory.get(tx.category) ?? months.map(() => 0);
    series[i] = (series[i] ?? 0) + tx.amount;
    perCategory.set(tx.category, series);
  }
  return [...perCategory.entries()]
    .map(([category, series]) => ({
      category,
      value: Math.round(weightedMovingAverage(series)),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
}

/**
 * Which month the forecast history should end on.
 * A month that is still in progress is incomplete, so it is excluded:
 *  - viewing a past month  → history ends with that month
 *  - viewing the current month → history ends with last month
 */
export function forecastHistoryEnd(selectedMonth: MonthKey, today: string): MonthKey {
  const current = monthKeyOf(today);
  return selectedMonth < current ? selectedMonth : addMonths(current, -1);
}
