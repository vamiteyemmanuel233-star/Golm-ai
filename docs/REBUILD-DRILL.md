# Phase 6 — Rebuild and adapt drill (GOLM AI)

The goal is to rebuild the core of this app from memory under time pressure, then adapt it to an unseen challenge.

## Drill 1 — Core rebuild in 90 minutes

1. (5 min) `npm create vite@latest drill -- --template react-ts`, then `npm install recharts lucide-react` and `npm install -D vitest`
2. (15 min) `types.ts` and `money.ts` (pesewas, parse, format). Write 3 tests first.
3. (15 min) `finance.ts`: `summarize`, `categoryBreakdown`, `budgetUtilization`
4. (20 min) Reducer + context + localStorage save/load
5. (20 min) Transaction form with validation + a list with delete confirmation
6. (15 min) One chart + one stat row

Score yourself: does it build, do the tests pass, does data survive a refresh?

## Drill 2 — Adapt to a new brief (60 minutes)

Pick one brief and change only what is needed. The `lib/` layer should mostly carry over.

- **Susu / group savings tracker:** members, contributions, payout rotation
- **Small-shop bookkeeping:** sales vs stock purchases, profit per week, low-stock alerts
- **Insurance premium planner:** policies, premiums due, reminders, coverage summary
- **Student budget:** allowance, school fees, feeding, data bundles, semester forecast

## Things to say out loud while building (judges like this)

- "Money is stored as integers."
- "Logic is separate from the UI, so it's tested."
- "This is a rule, not AI — and the screen says so."
- "The API key never reaches the browser."
