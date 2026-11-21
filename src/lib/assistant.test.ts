import { describe, expect, it } from 'vitest';
import { answerQuickQuestion, buildAiContext, QUICK_QUESTIONS } from './assistant';
import { generateDemoData } from './demoData';
import { tx } from './testUtils';

const today = '2026-11-20';
const demo = generateDemoData(today);
const inputs = { transactions: demo.transactions, budgets: demo.budgets, goals: demo.goals, month: '2026-11', today };

describe('buildAiContext', () => {
  it('shares only aggregated figures — never descriptions or IDs', () => {
    const context = buildAiContext(inputs);
    const serialised = JSON.stringify(context);
    for (const t of demo.transactions) {
      expect(serialised.includes(t.id)).toBe(false);
    }
    expect(serialised.includes('Airport taxi')).toBe(false);
    expect(serialised.includes('Support for parents')).toBe(false);
    expect(context.currency).toBe('GHS');
    expect(context.lastSixMonths).toHaveLength(6);
    // goal names are user-typed text, so they are not sent either
    expect(serialised.includes('Emergency fund')).toBe(false);
    expect(context.savingsGoals).toHaveLength(2);
    expect(context.expensesByPaymentMethod.length).toBeGreaterThan(0);
    // coaching facts are pre-calculated for the AI, without goal names
    expect(context.coach.averageMonthly?.completeMonthsUsed).toBe(3);
    expect(context.coach.suggestedReduction).not.toBeNull();
    expect(context.coach.goalChecks.map((g) => g.goal)).toEqual(['Goal 1', 'Goal 2']);
  });
});

describe('answerQuickQuestion', () => {
  it('answers every quick question from the data', () => {
    for (const q of QUICK_QUESTIONS) {
      const answer = answerQuickQuestion(q.id, inputs);
      expect(answer.length).toBeGreaterThan(20);
    }
    expect(answerQuickQuestion('summary', inputs)).toContain('November 2026');
    expect(answerQuickQuestion('budgets', inputs)).toContain('Over budget');
    expect(answerQuickQuestion('forecast', inputs)).toContain('statistical estimate');
    expect(answerQuickQuestion('goals', inputs)).toContain('School fees');
    expect(answerQuickQuestion('goals', { ...inputs, goals: [] })).toContain('no savings goals');
    expect(answerQuickQuestion('reduce', inputs)).toContain('Cutting it by 10%');
    expect(answerQuickQuestion('goal-check', inputs)).toContain('average surplus');
  });

  it('handles a month with no data', () => {
    const answer = answerQuickQuestion('summary', { transactions: [tx('income', 1, 'Salary', '2026-01-01')], budgets: [], month: '2026-11', today });
    expect(answer).toContain('no transactions');
  });
});
