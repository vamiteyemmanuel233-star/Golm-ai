/**
 * Rule-based financial insights. Every result comes from a transparent
 * formula applied to the user's stored data. None of this is a trained AI model.
 */
import type { Budget, MonthKey, Transaction } from '../types/finance';
import { daysInMonth, monthKeyOf, monthLabel } from './dates';
import { budgetUtilization, categoryBreakdown, summarize, type MonthTotal } from './finance';
import { formatCedi, formatPercent } from './money';

/* ------------------------------------------------------------------ */
/* Unusual expense detection (robust outlier test)                      */
/* ------------------------------------------------------------------ */

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

export interface UnusualExpense {
  transaction: Transaction;
  /** Typical (median) amount for this category, pesewas */
  typical: number;
  /** How many times the typical amount this expense is */
  multiple: number;
  /** Modified z-score (null when every past amount was identical) */
  score: number | null;
  sampleSize: number;
  reason: string;
}

export interface UnusualOptions {
  /** Only report expenses in this month (all months when omitted) */
  month?: MonthKey;
  /** A category needs this many expenses before we judge what is "normal" */
  minSamples?: number;
  /** Modified z-score threshold; 3.5 is the common rule of thumb (Iglewicz & Hoaglin) */
  threshold?: number;
}

/**
 * Flags expenses that are far above what is normal for their category.
 *
 * Method — modified z-score using the median absolute deviation (MAD):
 *   score = 0.6745 × (amount − median) ÷ MAD,  flagged when score > 3.5
 * The median and MAD are not pulled around by the outliers themselves, unlike
 * the mean and standard deviation. If MAD is 0 (all amounts identical), we flag
 * amounts of at least 2× the median instead.
 */
export function detectUnusualExpenses(
  transactions: readonly Transaction[],
  options: UnusualOptions = {},
): UnusualExpense[] {
  const minSamples = options.minSamples ?? 5;
  const threshold = options.threshold ?? 3.5;

  const byCategory = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const list = byCategory.get(tx.category) ?? [];
    list.push(tx);
    byCategory.set(tx.category, list);
  }

  const results: UnusualExpense[] = [];
  for (const [category, list] of byCategory) {
    if (list.length < minSamples) continue;
    const amounts = list.map((t) => t.amount);
    const typical = median(amounts);
    const mad = median(amounts.map((a) => Math.abs(a - typical)));
    if (typical <= 0) continue;

    for (const tx of list) {
      if (options.month && monthKeyOf(tx.date) !== options.month) continue;
      if (tx.amount <= typical) continue;
      const multiple = tx.amount / typical;
      let flagged: boolean;
      let score: number | null;
      if (mad > 0) {
        score = (0.6745 * (tx.amount - typical)) / mad;
        flagged = score > threshold;
      } else {
        score = null;
        flagged = multiple >= 2;
      }
      if (!flagged) continue;
      results.push({
        transaction: tx,
        typical,
        multiple,
        score,
        sampleSize: list.length,
        reason: `${formatCedi(tx.amount)} is ${multiple.toFixed(1)}× your typical ${category} expense (median ${formatCedi(Math.round(typical))} across ${list.length} transactions).`,
      });
    }
  }
  return results.sort((a, b) => b.multiple - a.multiple);
}

/* ------------------------------------------------------------------ */
/* Recommendations                                                      */
/* ------------------------------------------------------------------ */

export type Severity = 'critical' | 'warning' | 'info' | 'positive';

export interface Recommendation {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /** The rule and numbers behind this recommendation, shown to the user */
  basis: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };

export interface RecommendationInput {
  transactions: readonly Transaction[];
  budgets: readonly Budget[];
  month: MonthKey;
  /** Today's date (YYYY-MM-DD); used to judge spending pace in the current month */
  today: string;
  /** Complete months before `month`, oldest → newest */
  previousMonths: readonly MonthTotal[];
  unusual: readonly UnusualExpense[];
}

/** Spending for `month`, projected to a full month if `month` is still in progress. */
export function projectedMonthSpending(expenses: number, month: MonthKey, today: string): {
  value: number;
  isProjection: boolean;
} {
  if (monthKeyOf(today) !== month) return { value: expenses, isProjection: false };
  const elapsed = Number(today.slice(8, 10));
  const total = daysInMonth(month);
  if (elapsed <= 0 || elapsed >= total) return { value: expenses, isProjection: false };
  return { value: Math.round((expenses / elapsed) * total), isProjection: true };
}

export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const { transactions, budgets, month, today, previousMonths, unusual } = input;
  const recs: Recommendation[] = [];
  const summary = summarize(transactions, month);
  const label = monthLabel(month, 'long');

  if (summary.transactionCount === 0) {
    return [
      {
        id: 'no-data',
        severity: 'info',
        title: `No transactions recorded for ${label}`,
        detail: 'Add your income and expenses for this month to receive personalised insights.',
        basis: 'Insights are calculated only from transactions you have recorded.',
      },
    ];
  }

  // 1 & 2. Budget limits
  const statuses = budgetUtilization(transactions, budgets, month);
  for (const s of statuses) {
    if (s.state === 'over') {
      recs.push({
        id: `over-${s.category}`,
        severity: 'critical',
        title: `${s.category} is over budget`,
        detail: `You have spent ${formatCedi(s.spent)} against a ${formatCedi(s.limit)} budget — ${formatCedi(-s.remaining)} over. Review upcoming ${s.category} purchases or adjust the budget if it was unrealistic.`,
        basis: `Budget rule: spent ÷ limit = ${formatPercent(s.ratio)} (over 100%).`,
      });
    } else if (s.state === 'warning') {
      recs.push({
        id: `near-${s.category}`,
        severity: 'warning',
        title: `${s.category} budget is almost used`,
        detail: `${formatCedi(s.remaining)} left of your ${formatCedi(s.limit)} ${s.category} budget for ${label}.`,
        basis: `Budget rule: spent ÷ limit = ${formatPercent(s.ratio)} (85% or more triggers a warning).`,
      });
    }
  }

  // 3. Income vs spending
  if (summary.income === 0 && summary.expenses > 0) {
    recs.push({
      id: 'no-income',
      severity: 'warning',
      title: 'No income recorded this month',
      detail: `You have ${formatCedi(summary.expenses)} of expenses in ${label} but no income entries. If you were paid, add it so your savings figures are accurate.`,
      basis: 'Rule: expenses > 0 and income = 0 for the selected month.',
    });
  } else if (summary.savingsRate !== null) {
    const rate = summary.savingsRate;
    if (rate < 0) {
      recs.push({
        id: 'overspending',
        severity: 'critical',
        title: 'Spending is higher than income',
        detail: `Expenses exceed income by ${formatCedi(-summary.net)} in ${label}. Look at your largest categories first for savings.`,
        basis: `Savings rate = (income − expenses) ÷ income = ${formatPercent(rate)}.`,
      });
    } else if (rate < 0.1) {
      recs.push({
        id: 'low-savings',
        severity: 'warning',
        title: 'Savings rate is below 10%',
        detail: `You are keeping ${formatCedi(summary.net)} of ${formatCedi(summary.income)} income. Many personal-finance guides suggest aiming for 10–20% where your circumstances allow.`,
        basis: `Savings rate = ${formatPercent(rate)}; the rule flags anything under 10%.`,
      });
    } else if (rate >= 0.2) {
      recs.push({
        id: 'good-savings',
        severity: 'positive',
        title: 'Healthy savings rate',
        detail: `You are keeping ${formatPercent(rate)} of your income in ${label}. Consider setting a specific goal for this money, such as an emergency fund.`,
        basis: `Savings rate = ${formatPercent(rate)}; the rule highlights 20% or more.`,
      });
    }
  }

  // 4. Spending trend vs recent months
  const recent = previousMonths.slice(-3).filter((m) => m.expenses > 0);
  if (recent.length >= 2) {
    const average = recent.reduce((s, m) => s + m.expenses, 0) / recent.length;
    const { value, isProjection } = projectedMonthSpending(summary.expenses, month, today);
    const change = average > 0 ? (value - average) / average : 0;
    const wording = isProjection ? `At your current pace, ${label} spending will reach about` : `${label} spending was`;
    if (change > 0.15) {
      recs.push({
        id: 'trend-up',
        severity: 'warning',
        title: 'Spending is trending higher',
        detail: `${wording} ${formatCedi(value)}, ${formatPercent(change)} above your ${recent.length}-month average of ${formatCedi(Math.round(average))}.`,
        basis: isProjection
          ? 'Pace projection = spent so far ÷ days elapsed × days in month, compared with the average of recent complete months; flagged above +15%.'
          : 'Compared with the average of recent complete months; flagged above +15%.',
      });
    } else if (change < -0.15) {
      recs.push({
        id: 'trend-down',
        severity: 'positive',
        title: 'Spending is lower than usual',
        detail: `${wording} ${formatCedi(value)}, ${formatPercent(-change)} below your ${recent.length}-month average of ${formatCedi(Math.round(average))}.`,
        basis: 'Compared with the average of recent complete months; highlighted below −15%.',
      });
    }
  }

  // 5. Concentration in one category
  const top = categoryBreakdown(transactions, 'expense', month)[0];
  if (top && top.share > 0.4 && summary.expenses > 0) {
    recs.push({
      id: 'concentration',
      severity: 'info',
      title: `${top.category} is ${formatPercent(top.share)} of your spending`,
      detail: `${formatCedi(top.total)} of ${formatCedi(summary.expenses)} went to ${top.category} in ${label}. Large fixed costs like rent are normal; for flexible categories this is the best place to look for savings.`,
      basis: 'Rule: one category accounts for more than 40% of the month’s expenses.',
    });
  }

  // 6. Unusual expenses
  const first = unusual[0];
  if (first) {
    recs.push({
      id: 'unusual',
      severity: 'warning',
      title: unusual.length === 1 ? 'An unusual expense was detected' : `${unusual.length} unusual expenses were detected`,
      detail: `Largest: “${first.transaction.description || first.transaction.category}” — ${first.reason} Check it is correct and expected.`,
      basis: 'Modified z-score (median absolute deviation) above 3.5 within the category.',
    });
  }

  // 7. Budget coverage
  if (budgets.length === 0) {
    recs.push({
      id: 'no-budgets',
      severity: 'info',
      title: 'Set monthly budgets',
      detail: 'Budgets let GOLM AI warn you before a category runs over. Start with your two or three largest flexible categories.',
      basis: 'Rule: no budgets have been created yet.',
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: 'steady',
      severity: 'positive',
      title: 'Your finances look steady',
      detail: `No budget, savings or spending-trend rules were triggered for ${label}.`,
      basis: 'All rules checked: budgets, savings rate, trend, concentration and unusual expenses.',
    });
  }

  return recs.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
