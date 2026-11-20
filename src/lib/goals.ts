/**
 * Savings goals — e.g. an emergency fund, school fees, rent advance, a business.
 * Pure functions, unit-tested. GOLM AI tracks what the user says they have
 * set aside; it does not hold or move money.
 */
import type { SavingsGoal } from '../types/finance';
import { isValidISODate } from './dates';
import type { MonthTotal } from './finance';
import { parseCediInput } from './money';

export type GoalStatus = 'complete' | 'no-deadline' | 'overdue' | 'active';

export interface GoalPlan {
  status: GoalStatus;
  /** target − saved (0 when complete) */
  remaining: number;
  /** saved ÷ target, capped at 1 */
  progress: number;
  /** whole months left until the deadline (at least 1 when active) */
  monthsLeft: number | null;
  /** amount to set aside each month to finish on time, rounded up to the pesewa */
  perMonth: number | null;
}

/** Whole months from `today` to `deadline` (both YYYY-MM-DD). Negative if the deadline has passed. */
export function monthsBetween(today: string, deadline: string): number {
  const [y1 = 0, m1 = 1, d1 = 1] = today.split('-').map(Number);
  const [y2 = 0, m2 = 1, d2 = 1] = deadline.split('-').map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  return months;
}

/**
 * How much to save per month to reach the goal by its deadline:
 *   perMonth = ⌈(target − saved) ÷ monthsLeft⌉, with monthsLeft ≥ 1
 */
export function planGoal(goal: Pick<SavingsGoal, 'target' | 'saved' | 'deadline'>, today: string): GoalPlan {
  const remaining = Math.max(goal.target - goal.saved, 0);
  const progress = goal.target > 0 ? Math.min(goal.saved / goal.target, 1) : 0;
  if (remaining === 0) return { status: 'complete', remaining: 0, progress: 1, monthsLeft: null, perMonth: null };
  if (!goal.deadline) return { status: 'no-deadline', remaining, progress, monthsLeft: null, perMonth: null };
  if (goal.deadline < today) return { status: 'overdue', remaining, progress, monthsLeft: 0, perMonth: remaining };
  const monthsLeft = Math.max(monthsBetween(today, goal.deadline), 1);
  return { status: 'active', remaining, progress, monthsLeft, perMonth: Math.ceil(remaining / monthsLeft) };
}

/**
 * A common rule of thumb: keep about 3 months of expenses as an emergency fund.
 * Uses the average of recent complete months that had spending, rounded up to
 * the nearest GH₵10. Returns null when there is no spending history.
 */
export function suggestedEmergencyFund(history: readonly MonthTotal[], months = 3): { amount: number; average: number; monthsUsed: number } | null {
  const recent = history.filter((m) => m.expenses > 0).slice(-3);
  if (recent.length === 0) return null;
  const average = recent.reduce((s, m) => s + m.expenses, 0) / recent.length;
  const amount = Math.ceil((average * months) / 1000) * 1000;
  return { amount, average: Math.round(average), monthsUsed: recent.length };
}

export interface GoalInput {
  name: string;
  target: string;
  saved: string;
  deadline: string;
}

export type GoalErrors = Partial<Record<keyof GoalInput, string>>;

export type GoalValidation =
  | { ok: true; value: { name: string; target: number; saved: number; deadline: string | null } }
  | { ok: false; errors: GoalErrors };

export const GOAL_NAME_MAX = 60;

export function validateGoal(input: GoalInput, today: string): GoalValidation {
  const errors: GoalErrors = {};
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) errors.name = 'Give the goal a name.';
  else if (name.length > GOAL_NAME_MAX) errors.name = `Keep the name under ${GOAL_NAME_MAX} characters.`;

  const target = parseCediInput(input.target);
  if (!target.ok) errors.target = target.error;

  let saved = 0;
  if (input.saved.trim() !== '') {
    const parsed = parseCediInput(input.saved);
    if (!parsed.ok && !/^\s*0+(\.0{1,2})?\s*$/.test(input.saved)) errors.saved = parsed.error;
    else if (parsed.ok) saved = parsed.value;
  }

  let deadline: string | null = null;
  if (input.deadline) {
    if (!isValidISODate(input.deadline)) errors.deadline = 'Enter a real calendar date.';
    else if (input.deadline <= today) errors.deadline = 'Choose a date in the future.';
    else deadline = input.deadline;
  }

  if (Object.keys(errors).length > 0 || !target.ok) return { ok: false, errors };
  return { ok: true, value: { name, target: target.value, saved, deadline } };
}
