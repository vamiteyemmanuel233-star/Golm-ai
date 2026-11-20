/**
 * DEMONSTRATION DATA — invented for showing the app. It is NOT anyone's real
 * financial record. Every item is marked `isDemo: true` and the interface shows
 * a banner while it is loaded, with a one-click "Clear demo data" action.
 *
 * Generation is deterministic (seeded random numbers) so the demo looks the
 * same every time for a given date — useful when rehearsing for judges.
 */
import type { Budget, PaymentMethod, SavingsGoal, Transaction, TransactionType } from '../types/finance';
import { addMonths, daysInMonth, lastNMonths, monthKeyOf } from './dates';

/** Small, fast seeded pseudo-random generator (mulberry32). */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Draft {
  type: TransactionType;
  category: string;
  description: string;
  day: number;
  cedis: number;
  method?: PaymentMethod;
}

export interface DemoData {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
}

/** Typical Ghanaian payment method for each demo category. */
const DEFAULT_METHOD: Record<string, PaymentMethod> = {
  Salary: 'bank',
  Freelance: 'momo',
  'Rent & Housing': 'bank',
  'Mobile Data & Airtime': 'momo',
  Utilities: 'momo',
  'Family Support': 'momo',
  'Savings & Investments': 'bank',
  'Food & Groceries': 'cash',
  Transport: 'cash',
  Entertainment: 'card',
  Shopping: 'card',
  Education: 'bank',
  Health: 'cash',
};

/** Builds ~6 months of demo history ending on `today` (YYYY-MM-DD). */
export function generateDemoData(today: string): DemoData {
  const currentMonth = monthKeyOf(today);
  const months = lastNMonths(currentMonth, 6);
  const rand = seededRandom(20261121);
  const between = (min: number, max: number): number => Math.round(min + rand() * (max - min));
  const createdAt = `${today}T08:00:00.000Z`;

  const transactions: Transaction[] = [];
  let counter = 0;

  months.forEach((month, monthIndex) => {
    const drafts: Draft[] = [
      { type: 'income', category: 'Salary', description: 'Monthly salary', day: 1, cedis: 6800 },
      { type: 'expense', category: 'Rent & Housing', description: 'Apartment rent', day: 2, cedis: 1800 },
      { type: 'expense', category: 'Mobile Data & Airtime', description: 'Data bundle', day: 3, cedis: between(90, 140) },
      { type: 'expense', category: 'Utilities', description: 'Prepaid electricity', day: 5, cedis: between(240, 330) },
      { type: 'expense', category: 'Utilities', description: 'Water bill', day: 6, cedis: between(55, 75) },
      { type: 'expense', category: 'Family Support', description: 'Support for parents', day: 10, cedis: 400 },
      { type: 'expense', category: 'Mobile Data & Airtime', description: 'Airtime top-up', day: 18, cedis: between(40, 80) },
      { type: 'expense', category: 'Savings & Investments', description: 'Transfer to savings account', day: 3, cedis: 700 },
    ];

    // Weekly groceries
    [6, 13, 20, 27].forEach((day, i) =>
      drafts.push({
        type: 'expense',
        category: 'Food & Groceries',
        description: i % 2 === 0 ? 'Market groceries' : 'Supermarket shopping',
        day,
        cedis: between(230, 360),
        method: i % 2 === 0 ? 'cash' : 'momo',
      }),
    );
    // Transport
    [4, 8, 12, 16, 21, 25].forEach((day) =>
      drafts.push({ type: 'expense', category: 'Transport', description: 'Trotro and ride-hailing', day, cedis: between(35, 75) }),
    );
    // Entertainment and shopping
    drafts.push({ type: 'expense', category: 'Entertainment', description: 'Cinema and dinner', day: 14, cedis: between(120, 220) });
    if (monthIndex % 2 === 0) {
      drafts.push({ type: 'expense', category: 'Shopping', description: 'Clothing', day: 22, cedis: between(180, 320) });
    }
    // Occasional freelance income
    if (monthIndex % 2 === 1) {
      drafts.push({ type: 'income', category: 'Freelance', description: 'Website design project', day: 15, cedis: between(900, 1500) });
    }
    // One-off events that make the insights interesting (and are detectable)
    if (monthIndex === 1) {
      drafts.push({ type: 'expense', category: 'Education', description: 'Short course fees', day: 9, cedis: 1200 });
    }
    if (monthIndex === 3) {
      drafts.push({ type: 'expense', category: 'Food & Groceries', description: 'Catering for family celebration', day: 24, cedis: 1650 });
      drafts.push({ type: 'expense', category: 'Health', description: 'Pharmacy', day: 11, cedis: 145 });
    }
    if (monthIndex === 5) {
      drafts.push({ type: 'expense', category: 'Transport', description: 'Airport taxi', day: 2, cedis: 650 });
      drafts.push({ type: 'expense', category: 'Entertainment', description: 'Concert tickets', day: 3, cedis: 260 });
    }

    const lastDay = daysInMonth(month);
    for (const draft of drafts) {
      const day = Math.min(draft.day, lastDay);
      const date = `${month}-${String(day).padStart(2, '0')}`;
      if (date > today) continue; // never create future-dated records
      counter += 1;
      transactions.push({
        id: `demo-${month}-${String(counter).padStart(3, '0')}`,
        type: draft.type,
        amount: draft.cedis * 100,
        category: draft.category,
        description: draft.description,
        method: draft.method ?? DEFAULT_METHOD[draft.category] ?? 'cash',
        date,
        isDemo: true,
        createdAt,
        updatedAt: createdAt,
      });
    }
  });

  const budgets: Budget[] = [
    { category: 'Food & Groceries', limit: 1_300_00, isDemo: true },
    { category: 'Transport', limit: 450_00, isDemo: true },
    { category: 'Utilities', limit: 450_00, isDemo: true },
    { category: 'Mobile Data & Airtime', limit: 250_00, isDemo: true },
    { category: 'Entertainment', limit: 300_00, isDemo: true },
    { category: 'Shopping', limit: 400_00, isDemo: true },
  ];

  const goals: SavingsGoal[] = [
    { id: 'demo-goal-emergency', name: 'Emergency fund', target: 15_000_00, saved: 4_200_00, deadline: null, isDemo: true, createdAt, updatedAt: createdAt },
    { id: 'demo-goal-fees', name: 'School fees (next semester)', target: 3_500_00, saved: 1_200_00, deadline: `${addMonths(currentMonth, 4)}-15`, isDemo: true, createdAt, updatedAt: createdAt },
  ];

  return { transactions, budgets, goals };
}

/** The earliest month included in the demo (for tests and labels). */
export function demoStartMonth(today: string): string {
  return addMonths(monthKeyOf(today), -5);
}
