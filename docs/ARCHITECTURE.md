# GOLM AI — Architecture

## Overview

```
┌─────────────────────────── Browser (React 19 + Vite + TypeScript) ───────────────────────────┐
│                                                                                               │
│  Pages (src/features/*)                                                                        │
│  Dashboard · Transactions · Budgets · Goals · What-if · Analytics · Insights · AI Coach ·    │
│  Settings · About                                                                              │
│        │ read state / dispatch actions                                                         │
│        ▼                                                                                       │
│  State (src/state)  ── FinanceContext + pure reducer ──►  localStorage (validated on load)     │
│        │                                                                                       │
│        ▼                                                                                       │
│  Financial engine (src/lib) — pure functions, unit-tested, no network                         │
│  money · dates · finance · budgets · insights · forecast · goals · coach · simulator ·        │
│  csv · storage · validation · currency · assistant (AI summary builder)                       │
│        │                                                                                       │
│        │ only if the user consents: aggregated summary + question                              │
└────────┼──────────────────────────────────────────────────────────────────────────────────────┘
         ▼  POST /api/chat (Vite proxy in development)
┌────────────────────── Local AI server (server/index.mjs, Node built-ins only) ────────────────┐
│  validation · 32 KB body limit · 15 req/min rate limit · key from server/.env · 127.0.0.1    │
└────────┬──────────────────────────────────────────────────────────────────────────────────────┘
         ▼
   Google Gemini API (generateContent)
```

## Key design decisions

| Decision | Why |
|---|---|
| **Money as integers in minor units** (pesewas/cents) | Exact totals; avoids floating-point errors such as 0.1 + 0.2 ≠ 0.3. |
| **Engine separated from UI** | Every number is testable and reusable; the AI and the UI share one source of truth. |
| **AI explains, the engine calculates** | Language models can make arithmetic mistakes. GOLM sends **pre-calculated** coach facts and instructs the model not to recalculate. |
| **Local-first storage** | Privacy, offline use, zero hosting cost; validated on load with a recovery screen. |
| **Data minimisation for AI** | Only aggregates are sent; free-text fields (descriptions, goal names) never leave the device. |
| **Key on a server, never in the browser** | A key in front-end code can be copied by anyone. |
| **Currency = display symbol only** | No verified exchange-rate data, so amounts are never converted. |
| **Hash routing, lazy-loaded charts** | No router dependency; fast first load; works on any static host (Vercel). |

## Formulas

| Feature | Formula |
|---|---|
| Savings rate | (income − expenses) ÷ income |
| Average surplus | mean of (income − expenses) over up to 3 recent **complete** months with records |
| Budget alert | spent ÷ limit — warning ≥ 85%, over > 100% |
| Unusual expense | modified z-score 0.6745 × (x − median) ÷ MAD > 3.5 (per category, ≥ 5 samples) |
| Forecast | weighted moving average of up to 3 complete months (weights 1, 2, 3) + least-squares trend |
| Goal plan | needed per month = ⌈(target − saved) ÷ months left⌉ |
| Goal feasibility | needed ÷ average surplus: ≤ 50% achievable · ≤ 100% tight · > 100% not feasible |
| Category to reduce | flexible category over budget this month, else the largest flexible category; shows 10% and 20% savings |
| Savings plan | target = 20% of average income (a common guideline); gap = target − surplus; cuts of ≤ 20% per flexible category, largest first |
| What-if | saving = monthly spend × cut %; total = (Σ savings + extra income) × months; goal months = ⌈remaining ÷ (surplus + saving)⌉ |

Flexible categories are food, transport, data/airtime, entertainment, shopping and other. Rent, utilities, education, health, family support and savings are treated as essential.

## Files

```
src/brand.ts                 name, tagline, company, roadmap
src/lib/coach.ts             averages, reduction suggestion, goal feasibility, savings plan, coach answers
src/lib/simulator.ts         what-if engine
src/lib/currency.ts          currencies, countries, display symbol
src/lib/assistant.ts         AI summary (aggregates + coach facts) and quick answers
src/features/simulator/      What-if page
src/features/about/          Intro screen
src/features/goals/          Goals with affordability and date checks
src/features/assistant/      AI Coach page
server/index.mjs             Gemini proxy with validation and rate limiting
```
