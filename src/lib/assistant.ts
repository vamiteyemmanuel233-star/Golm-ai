/**
 * Assistant helpers.
 *
 * 1. buildAiContext() creates the ONLY data sent to the AI provider: aggregated
 *    totals per month and category. Descriptions, IDs and exact dates of
 *    individual transactions are never included (data minimisation).
 * 2. answerQuickQuestion() answers common questions with plain calculations.
 *    These answers are always labelled in the UI as "calculated locally — not AI".
 */
import type { Budget, MonthKey, SavingsGoal, Transaction } from '../types/finance';
import { getDisplayCurrency, type CurrencyCode } from './currency';
import { addMonths, lastNMonths, monthLabel } from './dates';
import { budgetUtilization, categoryBreakdown, methodBreakdown, monthlyTotals, summarize } from './finance';
import { planGoal } from './goals';
import { paymentMethodLabel } from './paymentMethods';
import { analyzeSpending, buildSavingsPlan, checkGoal, goalsAnswer, monthlyAverages, planAnswer, reduceAnswer, suggestReduction } from './coach';
import { forecastHistoryEnd, forecastNextMonth } from './forecast';
import { buildRecommendations, detectUnusualExpenses } from './insights';
import { formatCedi, formatPercent, toCedis } from './money';

export interface AiContext {
  /** Display currency code; amounts are in its main unit (not converted). */
  currency: CurrencyCode;
  country: string;
  selectedMonth: string;
  monthSummary: { income: number; expenses: number; net: number; savingsRatePercent: number | null };
  lastSixMonths: { month: string; income: number; expenses: number }[];
  expensesByCategory: { category: string; amount: number; sharePercent: number }[];
  budgets: { category: string; limit: number; spent: number; usedPercent: number; status: string }[];
  expensesByPaymentMethod: { method: string; amount: number; sharePercent: number }[];
  /** Goal names are NOT sent (they are free text the user typed); only numbers. */
  savingsGoals: { goal: string; target: number; saved: number; monthlyAmountNeeded: number | null; status: string }[];
  forecastNextMonthExpenses: { amount: number; method: string } | null;
  unusualExpenseCount: number;
  ruleBasedFindings: string[];
  /** Pre-calculated coaching facts (formulas from coach.ts) — the AI explains these, it does not recalculate them. */
  coach: {
    averageMonthly: { income: number; expenses: number; surplus: number; completeMonthsUsed: number } | null;
    suggestedReduction: { category: string; averageMonthly: number; save10PercentMonthly: number; save20PercentMonthly: number; reason: string } | null;
    savingsPlan: { guidelineTarget20PercentOfIncome: number; currentSurplus: number; gap: number; suggestedCuts: { category: string; cutPerMonth: number }[] } | null;
    goalChecks: { goal: string; neededPerMonth: number | null; status: string; monthsAtFullSurplus: number | null }[];
  };
}

export interface AssistantInputs {
  transactions: readonly Transaction[];
  budgets: readonly Budget[];
  month: MonthKey;
  today: string;
  goals?: readonly SavingsGoal[];
  /** Country name for context, e.g. "Ghana" */
  country?: string;
}

export function buildAiContext({ transactions, budgets, month, today, goals = [], country = 'Ghana' }: AssistantInputs): AiContext {
  const summary = summarize(transactions, month);
  const sixMonths = monthlyTotals(transactions, lastNMonths(month, 6));
  const previous = monthlyTotals(transactions, lastNMonths(addMonths(month, -1), 6));
  const forecast = forecastNextMonth(monthlyTotals(transactions, lastNMonths(forecastHistoryEnd(month, today), 6)));
  const unusual = detectUnusualExpenses(transactions, { month });
  const recs = buildRecommendations({ transactions, budgets, month, today, previousMonths: previous, unusual });

  return {
    currency: getDisplayCurrency(),
    country,
    selectedMonth: monthLabel(month, 'long'),
    monthSummary: {
      income: toCedis(summary.income),
      expenses: toCedis(summary.expenses),
      net: toCedis(summary.net),
      savingsRatePercent: summary.savingsRate === null ? null : Math.round(summary.savingsRate * 1000) / 10,
    },
    lastSixMonths: sixMonths.map((m) => ({ month: monthLabel(m.month), income: toCedis(m.income), expenses: toCedis(m.expenses) })),
    expensesByCategory: categoryBreakdown(transactions, 'expense', month).map((c) => ({
      category: c.category,
      amount: toCedis(c.total),
      sharePercent: Math.round(c.share * 1000) / 10,
    })),
    budgets: budgetUtilization(transactions, budgets, month).map((b) => ({
      category: b.category,
      limit: toCedis(b.limit),
      spent: toCedis(b.spent),
      usedPercent: Math.round(b.ratio * 1000) / 10,
      status: b.state,
    })),
    expensesByPaymentMethod: methodBreakdown(transactions, 'expense', month).map((m) => ({
      method: m.method === 'unrecorded' ? 'Not recorded' : paymentMethodLabel(m.method),
      amount: toCedis(m.total),
      sharePercent: Math.round(m.share * 1000) / 10,
    })),
    savingsGoals: goals.map((g, i) => {
      const plan = planGoal(g, today);
      return {
        goal: `Goal ${i + 1}`,
        target: toCedis(g.target),
        saved: toCedis(g.saved),
        monthlyAmountNeeded: plan.perMonth === null ? null : toCedis(plan.perMonth),
        status: plan.status,
      };
    }),
    forecastNextMonthExpenses: forecast
      ? { amount: toCedis(forecast.value), method: 'weighted moving average of recent months (statistical estimate)' }
      : null,
    unusualExpenseCount: unusual.length,
    ruleBasedFindings: recs.map((r) => r.title),
    coach: buildCoachFacts(transactions, budgets, goals, today),
  };
}

function buildCoachFacts(
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
  goals: readonly SavingsGoal[],
  today: string,
): AiContext['coach'] {
  const avg = monthlyAverages(transactions, today);
  const reduction = suggestReduction(transactions, budgets, today);
  const plan = buildSavingsPlan(transactions, goals, today);
  return {
    averageMonthly: avg
      ? { income: toCedis(avg.income), expenses: toCedis(avg.expenses), surplus: toCedis(avg.surplus), completeMonthsUsed: avg.months.length }
      : null,
    suggestedReduction: reduction
      ? {
          category: reduction.category,
          averageMonthly: toCedis(reduction.monthly),
          save10PercentMonthly: toCedis(reduction.save10),
          save20PercentMonthly: toCedis(reduction.save20),
          reason: reduction.reason,
        }
      : null,
    savingsPlan: plan
      ? {
          guidelineTarget20PercentOfIncome: toCedis(plan.target),
          currentSurplus: toCedis(plan.surplus),
          gap: toCedis(plan.gap),
          suggestedCuts: plan.cuts.map((c) => ({ category: c.category, cutPerMonth: toCedis(c.cut) })),
        }
      : null,
    // Goal names are user-typed, so they are replaced with "Goal 1", "Goal 2"…
    goalChecks: goals.map((g, i) => {
      const check = checkGoal(g, avg ? avg.surplus : null, today);
      return {
        goal: `Goal ${i + 1}`,
        neededPerMonth: check.needed === null ? null : toCedis(check.needed),
        status: check.status,
        monthsAtFullSurplus: check.monthsAtSurplus,
      };
    }),
  };
}

export type QuickQuestionId =
  | 'analyze'
  | 'reduce'
  | 'plan'
  | 'goal-check'
  | 'summary'
  | 'top-spending'
  | 'budgets'
  | 'forecast'
  | 'savings-tips'
  | 'goals';

/** Coach questions answered by formulas on this device (shown first). */
export const COACH_QUESTIONS: { id: QuickQuestionId; label: string }[] = [
  { id: 'analyze', label: 'Analyse my monthly spending' },
  { id: 'reduce', label: 'Which expense should I reduce?' },
  { id: 'plan', label: 'Create a realistic savings plan' },
  { id: 'goal-check', label: 'Can I achieve my savings goals?' },
];

/** The same coaching questions, sent to live Gemini for a personalised explanation. */
export const LIVE_COACH_PROMPTS: string[] = [
  'Analyse my monthly spending and tell me the two most important things to change.',
  'Which expense category should I reduce first, and how?',
  'Create a realistic monthly savings plan for me using my numbers.',
  'Can I achieve my savings goals on time? If not, what should I change?',
];

export const QUICK_QUESTIONS: { id: QuickQuestionId; label: string }[] = [
  ...COACH_QUESTIONS,
  { id: 'summary', label: 'How am I doing this month?' },
  { id: 'top-spending', label: 'Where does most of my money go?' },
  { id: 'budgets', label: 'Am I over any budget?' },
  { id: 'forecast', label: 'What might I spend next month?' },
  { id: 'savings-tips', label: 'How can I save more?' },
  { id: 'goals', label: 'Am I on track with my goals?' },
];

/** Deterministic answers from the user's data — no AI involved. */
export function answerQuickQuestion(id: QuickQuestionId, inputs: AssistantInputs): string {
  const { transactions, budgets, month, today, goals = [] } = inputs;
  const label = monthLabel(month, 'long');
  const summary = summarize(transactions, month);

  const coachInputs = { transactions, budgets, goals, month, today };
  if (id === 'analyze') return analyzeSpending(coachInputs);
  if (id === 'reduce') return reduceAnswer(coachInputs);
  if (id === 'plan') return planAnswer(coachInputs);
  if (id === 'goal-check') return goalsAnswer(coachInputs);

  if (id === 'goals') {
    if (goals.length === 0) return 'You have no savings goals yet. Create one on the Goals page — for example an emergency fund or school fees.';
    return goals
      .map((g) => {
        const plan = planGoal(g, today);
        const progress = `${formatCedi(g.saved)} of ${formatCedi(g.target)} (${formatPercent(plan.progress)})`;
        switch (plan.status) {
          case 'complete': return `• ${g.name}: complete — ${progress}.`;
          case 'overdue': return `• ${g.name}: ${progress}; the target date has passed with ${formatCedi(plan.remaining)} still to go.`;
          case 'no-deadline': return `• ${g.name}: ${progress}; ${formatCedi(plan.remaining)} to go (no target date set).`;
          default: return `• ${g.name}: ${progress}; set aside about ${formatCedi(plan.perMonth ?? 0)} a month for ${plan.monthsLeft} month(s) to finish on time.`;
        }
      })
      .join('\n');
  }

  if (summary.transactionCount === 0 && id !== 'forecast') {
    return `There are no transactions recorded for ${label} yet, so there is nothing to calculate. Add some income and expenses first.`;
  }

  switch (id) {
    case 'summary': {
      const rate = summary.savingsRate === null ? 'not available (no income recorded)' : formatPercent(summary.savingsRate);
      return `In ${label} you recorded ${formatCedi(summary.income)} of income and ${formatCedi(summary.expenses)} of expenses, leaving ${formatCedi(summary.net)}. Your savings rate is ${rate}.`;
    }
    case 'top-spending': {
      const top = categoryBreakdown(transactions, 'expense', month).slice(0, 3);
      if (top.length === 0) return `No expenses are recorded for ${label}.`;
      const parts = top.map((c) => `${c.category} ${formatCedi(c.total)} (${formatPercent(c.share)})`);
      return `Your largest expense categories in ${label} are: ${parts.join('; ')}.`;
    }
    case 'budgets': {
      const statuses = budgetUtilization(transactions, budgets, month);
      if (statuses.length === 0) return 'You have not set any budgets yet. Open the Budgets page to add one.';
      const over = statuses.filter((s) => s.state === 'over');
      const near = statuses.filter((s) => s.state === 'warning');
      if (over.length === 0 && near.length === 0) {
        return `All ${statuses.length} budgets are within limits for ${label}.`;
      }
      const overText = over.map((s) => `${s.category} (${formatCedi(-s.remaining)} over)`).join(', ');
      const nearText = near.map((s) => `${s.category} (${formatPercent(s.ratio)} used)`).join(', ');
      return [
        over.length ? `Over budget: ${overText}.` : '',
        near.length ? `Close to the limit: ${nearText}.` : '',
      ].filter(Boolean).join(' ');
    }
    case 'forecast': {
      const history = monthlyTotals(transactions, lastNMonths(forecastHistoryEnd(month, today), 6));
      const forecast = forecastNextMonth(history);
      if (!forecast) return 'There is not enough complete-month history to make a forecast yet.';
      return `Based on a weighted average of ${forecast.monthsUsed.map((m) => monthLabel(m)).join(', ')} (newer months weighted more), spending for the month after ${label} is estimated at about ${formatCedi(forecast.value)}. This is a statistical estimate, not a guarantee.`;
    }
    case 'savings-tips': {
      const previous = monthlyTotals(transactions, lastNMonths(addMonths(month, -1), 6));
      const unusual = detectUnusualExpenses(transactions, { month });
      const recs = buildRecommendations({ transactions, budgets, month, today, previousMonths: previous, unusual })
        .filter((r) => r.severity !== 'positive')
        .slice(0, 3);
      if (recs.length === 0) return `No savings issues were flagged for ${label}. Keep tracking consistently.`;
      return recs.map((r, i) => `${i + 1}. ${r.title}: ${r.detail}`).join('\n');
    }
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}
