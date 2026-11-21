/**
 * GOLM AI Coach — the calculation engine behind the coach.
 *
 * Every number here is a transparent formula over the user's own records.
 * The live AI (Gemini) receives these results as facts and explains them;
 * it is never asked to do the arithmetic itself.
 */
import type { Budget, MonthKey, SavingsGoal, Transaction } from '../types/finance';
import { addMonths, lastNMonths, monthKeyOf, monthLabel } from './dates';
import { budgetUtilization, monthlyTotals, type MonthTotal } from './finance';
import { planGoal } from './goals';
import { formatCedi, formatPercent } from './money';

/** Categories most people can trim. Rent, utilities, school fees, health and family support are treated as essential. */
export const FLEXIBLE_CATEGORIES = [
  'Food & Groceries',
  'Transport',
  'Mobile Data & Airtime',
  'Entertainment',
  'Shopping',
  'Other Expense',
] as const;

export function isFlexible(category: string): boolean {
  return (FLEXIBLE_CATEGORIES as readonly string[]).includes(category);
}

/* ------------------------------------------------------------------ */
/* Averages from complete months                                        */
/* ------------------------------------------------------------------ */

export interface MonthlyAverages {
  /** complete months used (oldest → newest), only months that had records */
  months: MonthTotal[];
  income: number;
  expenses: number;
  /** income − expenses: the money left over each month on average */
  surplus: number;
}

/**
 * Average monthly income, spending and surplus over up to `count` recent
 * COMPLETE months that have records (the month in progress is excluded).
 */
export function monthlyAverages(transactions: readonly Transaction[], today: string, count = 3): MonthlyAverages | null {
  const lastComplete = addMonths(monthKeyOf(today), -1);
  const months = monthlyTotals(transactions, lastNMonths(lastComplete, 12))
    .filter((m) => m.income > 0 || m.expenses > 0)
    .slice(-count);
  if (months.length === 0) return null;
  const n = months.length;
  const income = Math.round(months.reduce((s, m) => s + m.income, 0) / n);
  const expenses = Math.round(months.reduce((s, m) => s + m.expenses, 0) / n);
  return { months, income, expenses, surplus: income - expenses };
}

export interface CategoryAverage {
  category: string;
  /** average monthly spend in pesewas */
  monthly: number;
  flexible: boolean;
}

/** Average monthly spend per expense category over the given months, largest first. */
export function categoryAverages(transactions: readonly Transaction[], months: readonly MonthKey[]): CategoryAverage[] {
  if (months.length === 0) return [];
  const set = new Set(months);
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !set.has(monthKeyOf(tx.date))) continue;
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, monthly: Math.round(total / months.length), flexible: isFlexible(category) }))
    .sort((a, b) => b.monthly - a.monthly);
}

/* ------------------------------------------------------------------ */
/* Which category to reduce                                             */
/* ------------------------------------------------------------------ */

export interface ReductionSuggestion {
  category: string;
  monthly: number;
  /** why this category was chosen */
  reason: string;
  /** saving per month if cut by 10% and 20% */
  save10: number;
  save20: number;
}

/**
 * Picks the category to reduce first:
 *  1. a flexible category that is over budget this month (largest overspend), otherwise
 *  2. the flexible category with the highest average monthly spend.
 */
export function suggestReduction(
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
  today: string,
): ReductionSuggestion | null {
  const averages = monthlyAverages(transactions, today);
  const months = averages ? averages.months.map((m) => m.month) : [monthKeyOf(today)];
  const flexible = categoryAverages(transactions, months).filter((c) => c.flexible);
  if (flexible.length === 0) return null;

  const over = budgetUtilization(transactions, budgets, monthKeyOf(today))
    .filter((b) => b.state === 'over' && isFlexible(b.category))
    .sort((a, b) => a.remaining - b.remaining)[0];
  const overAvg = over ? flexible.find((c) => c.category === over.category) : undefined;

  const pick = overAvg ?? flexible[0]!;
  const reason = overAvg && over
    ? `it is over budget this month (${formatCedi(over.spent)} of ${formatCedi(over.limit)}) and is a flexible expense`
    : `it is your largest flexible expense, averaging ${formatCedi(pick.monthly)} a month`;
  return {
    category: pick.category,
    monthly: pick.monthly,
    reason,
    save10: Math.round(pick.monthly * 0.1),
    save20: Math.round(pick.monthly * 0.2),
  };
}

/* ------------------------------------------------------------------ */
/* Goal feasibility                                                     */
/* ------------------------------------------------------------------ */

export type Feasibility = 'reached' | 'on-track' | 'stretch' | 'not-feasible' | 'no-surplus' | 'no-deadline';

export interface GoalCheck {
  goal: SavingsGoal;
  remaining: number;
  /** monthly amount needed to meet the deadline (null without a deadline) */
  needed: number | null;
  /** average monthly surplus available */
  surplus: number | null;
  /** months to finish if the whole average surplus went to this goal */
  monthsAtSurplus: number | null;
  status: Feasibility;
  summary: string;
}

/**
 * Can the goal be reached by its date?
 *   needed = ⌈remaining ÷ months left⌉ (from planGoal)
 *   on-track   when needed ≤ 50% of the average surplus
 *   stretch    when needed ≤ 100% of the surplus
 *   not-feasible when needed > surplus
 * The surplus is shared by all goals, so several "stretch" goals together may not fit.
 */
export function checkGoal(goal: SavingsGoal, surplus: number | null, today: string): GoalCheck {
  const plan = planGoal(goal, today);
  const monthsAtSurplus = surplus !== null && surplus > 0 && plan.remaining > 0 ? Math.ceil(plan.remaining / surplus) : null;
  const base = { goal, remaining: plan.remaining, needed: plan.perMonth, surplus, monthsAtSurplus };

  if (plan.status === 'complete') return { ...base, status: 'reached', summary: `“${goal.name}” is already reached.` };
  if (surplus === null || surplus <= 0) {
    return {
      ...base,
      status: 'no-surplus',
      summary: `“${goal.name}” needs ${formatCedi(plan.remaining)} more, but your recent months show no money left over after expenses. Reducing spending comes first.`,
    };
  }
  if (plan.status === 'no-deadline' || plan.perMonth === null) {
    return {
      ...base,
      status: 'no-deadline',
      summary: `“${goal.name}”: ${formatCedi(plan.remaining)} to go. Putting your whole average surplus of ${formatCedi(surplus)} towards it would take about ${monthsAtSurplus} month(s).`,
    };
  }
  const share = plan.perMonth / surplus;
  const status: Feasibility = share <= 0.5 ? 'on-track' : share <= 1 ? 'stretch' : 'not-feasible';
  const when = plan.status === 'overdue' ? 'now (the date has passed)' : `each month for ${plan.monthsLeft} month(s)`;
  const verdict =
    status === 'on-track'
      ? 'This looks achievable — it uses ' + formatPercent(share) + ' of your average surplus.'
      : status === 'stretch'
        ? 'Possible but tight — it uses ' + formatPercent(share) + ' of your average surplus, leaving little for anything else.'
        : `Not achievable at your current pace — it needs ${formatPercent(share)} of your average surplus. Extend the date, lower the target or cut spending by about ${formatCedi(plan.perMonth - surplus)} a month.`;
  return {
    ...base,
    status,
    summary: `“${goal.name}” needs ${formatCedi(plan.perMonth)} ${when}; your average surplus is ${formatCedi(surplus)}. ${verdict}`,
  };
}

/** Checks a goal against a different target date (e.g. "by December"). */
export function checkGoalByDate(goal: SavingsGoal, deadline: string, surplus: number | null, today: string): GoalCheck {
  return checkGoal({ ...goal, deadline }, surplus, today);
}

/* ------------------------------------------------------------------ */
/* Savings plan                                                         */
/* ------------------------------------------------------------------ */

export interface SavingsPlan {
  income: number;
  expenses: number;
  surplus: number;
  /** guideline target: 20% of average income */
  target: number;
  /** how far the current surplus is from the target (0 if already met) */
  gap: number;
  /** suggested cuts to close the gap: up to 20% of each flexible category, largest first */
  cuts: { category: string; monthly: number; cut: number }[];
  /** total of the suggested cuts */
  cutTotal: number;
  /** monthly amount needed by dated goals */
  goalNeeds: number;
  monthsUsed: string[];
}

/**
 * A realistic plan built from averages, using the common "save 20% of income"
 * guideline as the target (a guideline, not a rule). If the current surplus is
 * short of it, it proposes trimming flexible categories by at most 20% each.
 */
export function buildSavingsPlan(
  transactions: readonly Transaction[],
  goals: readonly SavingsGoal[],
  today: string,
): SavingsPlan | null {
  const avg = monthlyAverages(transactions, today);
  if (!avg || avg.income <= 0) return null;
  const target = Math.round(avg.income * 0.2);
  const gap = Math.max(target - avg.surplus, 0);
  const cuts: SavingsPlan['cuts'] = [];
  let remaining = gap;
  for (const c of categoryAverages(transactions, avg.months.map((m) => m.month)).filter((x) => x.flexible)) {
    if (remaining <= 0) break;
    const cut = Math.min(Math.round(c.monthly * 0.2), remaining);
    if (cut <= 0) continue;
    cuts.push({ category: c.category, monthly: c.monthly, cut });
    remaining -= cut;
  }
  const goalNeeds = goals.reduce((s, g) => s + (planGoal(g, today).perMonth ?? 0), 0);
  return {
    income: avg.income,
    expenses: avg.expenses,
    surplus: avg.surplus,
    target,
    gap,
    cuts,
    cutTotal: cuts.reduce((s, c) => s + c.cut, 0),
    goalNeeds,
    monthsUsed: avg.months.map((m) => m.month),
  };
}

/* ------------------------------------------------------------------ */
/* Text answers for the coach (formula-based, labelled "not AI")         */
/* ------------------------------------------------------------------ */

export interface CoachInputs {
  transactions: readonly Transaction[];
  budgets: readonly Budget[];
  goals: readonly SavingsGoal[];
  month: MonthKey;
  today: string;
}

const monthsText = (months: readonly string[]) => months.map((m) => monthLabel(m)).join(', ');

export function analyzeSpending({ transactions, today }: CoachInputs): string {
  const avg = monthlyAverages(transactions, today);
  if (!avg) return 'There are no complete months of records yet. Keep recording for a month and I can analyse your spending pattern.';
  const cats = categoryAverages(transactions, avg.months.map((m) => m.month));
  const top = cats.slice(0, 3).map((c) => `${c.category} ${formatCedi(c.monthly)}`).join('; ');
  const essential = cats.filter((c) => !c.flexible).reduce((s, c) => s + c.monthly, 0);
  const flexible = cats.filter((c) => c.flexible).reduce((s, c) => s + c.monthly, 0);
  const rate = avg.income > 0 ? `${formatPercent(avg.surplus / avg.income)} of income` : 'no income recorded';
  return [
    `Based on ${monthsText(avg.months.map((m) => m.month))}, you earn about ${formatCedi(avg.income)} and spend about ${formatCedi(avg.expenses)} a month, leaving ${formatCedi(avg.surplus)} (${rate}).`,
    `- Largest categories: ${top || 'none'}.`,
    `- Essential costs (rent, utilities, school, health, family): ${formatCedi(essential)} a month.`,
    `- Flexible costs (food, transport, data, entertainment, shopping): ${formatCedi(flexible)} a month — this is where savings usually come from.`,
  ].join('\n');
}

export function reduceAnswer(inputs: CoachInputs): string {
  const s = suggestReduction(inputs.transactions, inputs.budgets, inputs.today);
  if (!s) return 'I could not find flexible expenses (food, transport, data, entertainment, shopping) in your recent records.';
  return [
    `Start with ${s.category}: ${s.reason}.`,
    `- Cutting it by 10% saves about ${formatCedi(s.save10)} a month (${formatCedi(s.save10 * 12)} a year).`,
    `- Cutting it by 20% saves about ${formatCedi(s.save20)} a month (${formatCedi(s.save20 * 12)} a year).`,
    'Try different amounts on the What-if page.',
  ].join('\n');
}

export function planAnswer(inputs: CoachInputs): string {
  const p = buildSavingsPlan(inputs.transactions, inputs.goals, inputs.today);
  if (!p) return 'I need at least one complete month with income recorded to build a savings plan.';
  const lines = [
    `Based on ${monthsText(p.monthsUsed)}: income ${formatCedi(p.income)}, spending ${formatCedi(p.expenses)}, left over ${formatCedi(p.surplus)} a month.`,
    `- Guideline target: save 20% of income = ${formatCedi(p.target)} a month.`,
  ];
  if (p.gap === 0) lines.push(`- You already meet it. Set aside ${formatCedi(p.target)} on payday before spending, and direct any extra to your goals.`);
  else {
    lines.push(`- You are ${formatCedi(p.gap)} a month short of it.`);
    for (const c of p.cuts) lines.push(`- Trim ${c.category} by ${formatCedi(c.cut)} (from ${formatCedi(c.monthly)}).`);
    if (p.cutTotal < p.gap) lines.push(`- Those cuts cover ${formatCedi(p.cutTotal)}; the rest would need more income or larger changes.`);
  }
  if (p.goalNeeds > 0) lines.push(`- Your dated goals need ${formatCedi(p.goalNeeds)} a month in total.`);
  lines.push('Guidelines differ by situation — adjust the target to what is realistic for you.');
  return lines.join('\n');
}

export function goalsAnswer(inputs: CoachInputs): string {
  if (inputs.goals.length === 0) return 'You have no savings goals yet. Create one on the Goals page, then ask again.';
  const avg = monthlyAverages(inputs.transactions, inputs.today);
  return inputs.goals.map((g) => `- ${checkGoal(g, avg ? avg.surplus : null, inputs.today).summary}`).join('\n');
}

/** Months between today and the end of a given month key (for "by December"-style questions). */
export function endOfMonth(month: MonthKey): string {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, '0')}`;
}

