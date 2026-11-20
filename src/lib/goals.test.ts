import { describe, expect, it } from 'vitest';
import { monthsBetween, planGoal, suggestedEmergencyFund, validateGoal } from './goals';

describe('monthsBetween', () => {
  it('counts whole months', () => {
    expect(monthsBetween('2026-11-20', '2027-05-20')).toBe(6);
    expect(monthsBetween('2026-11-20', '2027-05-19')).toBe(5);
    expect(monthsBetween('2026-11-20', '2026-12-01')).toBe(0);
    expect(monthsBetween('2026-11-20', '2026-10-20')).toBe(-1);
  });
});

describe('planGoal', () => {
  const today = '2026-11-20';

  it('works out the monthly amount needed, rounded up', () => {
    // GH₵1,000 left over 6 months → GH₵166.67 per month (16666.67 → 16667 pesewas)
    const plan = planGoal({ target: 200000, saved: 100000, deadline: '2027-05-20' }, today);
    expect(plan.status).toBe('active');
    expect(plan.monthsLeft).toBe(6);
    expect(plan.perMonth).toBe(16667);
    expect(plan.progress).toBe(0.5);
  });

  it('uses at least one month when the deadline is close', () => {
    expect(planGoal({ target: 50000, saved: 0, deadline: '2026-12-01' }, today).perMonth).toBe(50000);
  });

  it('handles complete, overdue and open-ended goals', () => {
    expect(planGoal({ target: 1000, saved: 1500, deadline: null }, today)).toEqual({ status: 'complete', remaining: 0, progress: 1, monthsLeft: null, perMonth: null });
    expect(planGoal({ target: 1000, saved: 200, deadline: '2026-11-01' }, today).status).toBe('overdue');
    const open = planGoal({ target: 1000, saved: 250, deadline: null }, today);
    expect(open.status).toBe('no-deadline');
    expect(open.remaining).toBe(750);
    expect(open.perMonth).toBeNull();
  });
});

describe('suggestedEmergencyFund', () => {
  it('is 3× average recent spending, rounded up to GH₵10', () => {
    const s = suggestedEmergencyFund([
      { month: '2026-07', income: 0, expenses: 0, net: 0 },
      { month: '2026-08', income: 0, expenses: 400000, net: 0 },
      { month: '2026-09', income: 0, expenses: 500000, net: 0 },
      { month: '2026-10', income: 0, expenses: 600050, net: 0 },
    ]);
    // average = 500016.67; × 3 = 1500050 → rounded up to 1501000 (GH₵15,010)
    expect(s?.amount).toBe(1501000);
    expect(s?.monthsUsed).toBe(3);
  });

  it('returns null without spending history', () => {
    expect(suggestedEmergencyFund([])).toBeNull();
  });
});

describe('validateGoal', () => {
  const today = '2026-11-20';
  it('accepts a valid goal and defaults saved to 0', () => {
    const r = validateGoal({ name: ' School fees ', target: '3,500', saved: '', deadline: '2027-01-10' }, today);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ name: 'School fees', target: 350000, saved: 0, deadline: '2027-01-10' });
  });

  it('accepts an explicit zero saved amount and no deadline', () => {
    const r = validateGoal({ name: 'Emergency fund', target: '1000', saved: '0', deadline: '' }, today);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.deadline).toBeNull();
  });

  it('rejects missing names, bad amounts and past deadlines', () => {
    const r = validateGoal({ name: '', target: '-5', saved: 'abc', deadline: '2026-11-01' }, today);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBeDefined();
      expect(r.errors.target).toBeDefined();
      expect(r.errors.saved).toBeDefined();
      expect(r.errors.deadline).toBeDefined();
    }
  });
});
