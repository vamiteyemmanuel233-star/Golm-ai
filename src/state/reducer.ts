/**
 * All changes to financial data go through this pure reducer.
 * Pure = same input, same output, no side effects — which makes it easy to test.
 */
import type { Budget, FinanceData, SavingsGoal, Transaction } from '../types/finance';
import { MAX_AMOUNT_PESEWAS } from '../lib/money';

export type FinanceAction =
  | { type: 'transaction/add'; transaction: Transaction }
  | { type: 'transaction/update'; transaction: Transaction }
  | { type: 'transaction/delete'; id: string }
  | { type: 'budget/set'; budget: Budget }
  | { type: 'budget/remove'; category: string }
  | { type: 'goal/add'; goal: SavingsGoal }
  | { type: 'goal/update'; goal: SavingsGoal }
  | { type: 'goal/delete'; id: string }
  /** Add (positive) or withdraw (negative) money from a goal; the balance never goes below 0. */
  | { type: 'goal/adjust'; id: string; delta: number; at: string }
  | { type: 'demo/load'; transactions: Transaction[]; budgets: Budget[]; goals: SavingsGoal[] }
  | { type: 'demo/clear' }
  | { type: 'data/clearAll' }
  | { type: 'data/replace'; data: FinanceData };

export function financeReducer(state: FinanceData, action: FinanceAction): FinanceData {
  switch (action.type) {
    case 'transaction/add':
      if (state.transactions.some((t) => t.id === action.transaction.id)) return state;
      return { ...state, transactions: [...state.transactions, action.transaction] };

    case 'transaction/update':
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.transaction.id ? action.transaction : t)),
      };

    case 'transaction/delete':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };

    case 'budget/set': {
      const exists = state.budgets.some((b) => b.category === action.budget.category);
      return {
        ...state,
        budgets: exists
          ? state.budgets.map((b) => (b.category === action.budget.category ? action.budget : b))
          : [...state.budgets, action.budget],
      };
    }

    case 'budget/remove':
      return { ...state, budgets: state.budgets.filter((b) => b.category !== action.category) };

    case 'goal/add':
      if (state.goals.some((g) => g.id === action.goal.id)) return state;
      return { ...state, goals: [...state.goals, action.goal] };

    case 'goal/update':
      return { ...state, goals: state.goals.map((g) => (g.id === action.goal.id ? action.goal : g)) };

    case 'goal/delete':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };

    case 'goal/adjust':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.id
            ? { ...g, saved: Math.min(Math.max(g.saved + action.delta, 0), MAX_AMOUNT_PESEWAS), updatedAt: action.at }
            : g,
        ),
      };

    case 'demo/load': {
      // Replace any previous demo data, keep everything the user entered.
      const userTransactions = state.transactions.filter((t) => !t.isDemo);
      const userBudgets = state.budgets.filter((b) => !b.isDemo);
      const taken = new Set(userBudgets.map((b) => b.category));
      return {
        ...state,
        transactions: [...userTransactions, ...action.transactions],
        budgets: [...userBudgets, ...action.budgets.filter((b) => !taken.has(b.category))],
        goals: [...state.goals.filter((g) => !g.isDemo), ...action.goals],
      };
    }

    case 'demo/clear':
      return {
        ...state,
        transactions: state.transactions.filter((t) => !t.isDemo),
        budgets: state.budgets.filter((b) => !b.isDemo),
        goals: state.goals.filter((g) => !g.isDemo),
      };

    case 'data/clearAll':
      return { version: 1, transactions: [], budgets: [], goals: [] };

    case 'data/replace':
      return action.data;

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function hasDemoData(state: FinanceData): boolean {
  return state.transactions.some((t) => t.isDemo) || state.budgets.some((b) => b.isDemo) || state.goals.some((g) => g.isDemo);
}
