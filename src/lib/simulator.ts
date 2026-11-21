/**
 * What-if simulator — pure, offline calculations.
 *
 *   monthly saving per category = monthly spend × reduction %
 *   total monthly saving        = Σ category savings + extra monthly income
 *   saving over N months        = total monthly saving × N
 *
 * It assumes the change is kept up every month and ignores interest and
 * inflation, and the screen says so.
 * Example: GH₵500 food × 20% = GH₵100 a month → GH₵1,200 over 12 months.
 */
import type { Transaction } from '../types/finance';
import { categoryAverages, monthlyAverages } from './coach';
import { monthKeyOf } from './dates';

export interface BaselineRow {
  category: string;
  /** monthly spend in pesewas */
  monthly: number;
  flexible: boolean;
}

export interface Baseline {
  rows: BaselineRow[];
  /** months the averages came from; empty when nothing is recorded */
  months: string[];
  /** 'average' of complete months, 'current' month so far, or 'none' */
  source: 'average' | 'current' | 'none';
  surplus: number | null;
}

/** Starting point: average monthly spend per category from complete months, else this month so far. */
export function buildBaseline(transactions: readonly Transaction[], today: string): Baseline {
  const avg = monthlyAverages(transactions, today);
  if (avg) {
    const months = avg.months.map((m) => m.month);
    return { rows: categoryAverages(transactions, months), months, source: 'average', surplus: avg.surplus };
  }
  const current = monthKeyOf(today);
  const rows = categoryAverages(transactions, [current]);
  return { rows, months: rows.length ? [current] : [], source: rows.length ? 'current' : 'none', surplus: null };
}

export interface SimulationInput {
  rows: { category: string; monthly: number; percent: number }[];
  /** extra monthly income in pesewas (e.g. a side job) */
  extraIncome: number;
  horizonMonths: number;
}

export interface SimulationResult {
  rows: { category: string; monthly: number; percent: number; saving: number; newMonthly: number }[];
  monthlyFromCuts: number;
  monthlySaving: number;
  total: number;
  /** cumulative saving at the end of each month 1…N */
  series: { month: number; cumulative: number }[];
}

export function clampPercent(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(Math.max(Math.round(p), 0), 100);
}

export function simulate(input: SimulationInput): SimulationResult {
  const horizon = Math.min(Math.max(Math.round(input.horizonMonths), 1), 120);
  const rows = input.rows.map((r) => {
    const monthly = Math.max(Math.round(r.monthly), 0);
    const percent = clampPercent(r.percent);
    const saving = Math.round((monthly * percent) / 100);
    return { category: r.category, monthly, percent, saving, newMonthly: monthly - saving };
  });
  const monthlyFromCuts = rows.reduce((s, r) => s + r.saving, 0);
  const monthlySaving = monthlyFromCuts + Math.max(Math.round(input.extraIncome), 0);
  const series = Array.from({ length: horizon }, (_, i) => ({ month: i + 1, cumulative: monthlySaving * (i + 1) }));
  return { rows, monthlyFromCuts, monthlySaving, total: monthlySaving * horizon, series };
}

/** Whole months to save `remaining` at `perMonth` (null if it would never finish). */
export function monthsToReach(remaining: number, perMonth: number): number | null {
  if (remaining <= 0) return 0;
  if (perMonth <= 0) return null;
  return Math.ceil(remaining / perMonth);
}

export interface GoalImpact {
  remaining: number;
  before: number | null;
  after: number | null;
  /** months saved by the scenario (null when not comparable) */
  sooner: number | null;
}

/** How the scenario changes the time to reach a goal, if the surplus (+ savings) goes to it. */
export function goalImpact(remaining: number, surplus: number | null, monthlySaving: number): GoalImpact {
  const base = surplus !== null && surplus > 0 ? surplus : 0;
  const before = monthsToReach(remaining, base);
  const after = monthsToReach(remaining, base + monthlySaving);
  return { remaining, before, after, sooner: before !== null && after !== null ? before - after : null };
}
