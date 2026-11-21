# Development record

All work below was done on **20 November 2026** (version 1.0 as *SwiftWise AI*, then version 1.1 rebranded as *GOLM AI*) (Africa/Accra) as an **independent practice project** before the CODED × Dalex SWIFT AI Hackathon (21 and 27 November 2026). None of it was done during the official competition.

| Step | What was built |
|---|---|
| 1 | Project configuration: Vite 7, React 19, strict TypeScript, Vitest, Recharts, Lucide icons |
| 2 | Core library: integer-pesewa money maths, dates, summaries, budgets, filters, validation, CSV export, validated storage |
| 3 | Insights: robust unusual-expense detection, rule-based recommendations, weighted-moving-average forecast |
| 4 | Demo data generator (seeded, clearly marked) and assistant context builder (aggregates only) |
| 5 | Unit tests for all calculations, the reducer and server validation |
| 6 | React interface: app shell, dashboard, transactions, budgets, analytics, insights, assistant, settings, recovery screen |
| 7 | Optional AI server for Google Gemini (key kept server-side, validation, rate limit, consent in the UI) |
| 8 | Browser testing at desktop and mobile sizes; fixes for StrictMode-safe focus/saving, the AI history format and mobile header layout |
| 9 | README, demo script and rebuild drill |

| 10 | **v1.1 — Rebrand to GOLM AI** (Vamit Golm Company Limited): central brand file, new logo and favicon, loading screen, footer, metadata, docs |
| 11 | Payment methods (Mobile Money, cash, bank, card) on transactions, filters, CSV, analytics and AI summary |
| 12 | Savings goals with monthly saving plan and emergency-fund suggestion |
| 13 | Planned-features list (clearly marked as not available) |
| 14 | Backward compatibility: data saved by v1.0 loads unchanged (storage keys kept) |

| 15 | **v1.2 — Hackathon upgrade** (21 Nov 2026, built on v1.1): AI financial coach engine and coach UI (formula answers + live Gemini prompts with pre-calculated facts) |
| 16 | What-if simulator page (per-category cuts, extra income, horizon, calculation card, chart, goal impact) |
| 17 | Smart goals: affordability vs average surplus, feasibility badges, "Can I reach it by…?" check |
| 18 | Region & currency preference (GHS, NGN, KES, USD, GBP, EUR — display only, no conversion) |
| 19 | Intro screen (#/about), README, ARCHITECTURE and HACKATHON-PITCH docs |

| 20 | **v1.2.1 — Live AI on Vercel** (21 Nov 2026): serverless functions `api/health.js` and `api/chat.js`; shared `server/gemini.mjs` and `server/handlers.mjs`; friendlier error messages; `.env.example`; `docs/DEPLOY-VERCEL.md` |

## Verification performed while building (v1.2.1)

- 116 unit tests, including the new hosted-AI handler tests, passed with a Vitest-compatible runner.
- The real `api/health.js` and `api/chat.js` files were run behind a Vercel-style Node server against a **mock** Gemini API, as was the refactored local server.
- **Not verified here:** an actual Vercel deployment and a real Gemini call from Vercel. Follow `docs/DEPLOY-VERCEL.md` → "Check it works".

## Verification performed while building (v1.2)

- 110 unit tests passed (16 files) with a Vitest-compatible runner in the build environment; the real `vitest` package could not be installed there. **Run `npm test` yourself to confirm with real Vitest.**
- Strict `tsc` passed for all library code. React code passed type-checking against simplified React type definitions (official ones could not be installed).
- 76 automated browser checks passed in headless Chromium (desktop and phone size), using real React 19 with stand-in icon and chart components. They covered all v1.1 features, loading data saved by older versions, the What-if example (GH₵500 × 20% = GH₵100/month, GH₵1,200/12 months), smart goals, coach answers, the live-AI coach path against a **mock** Gemini server, currency switching and the intro screen.
- **Not verified in the build environment:** `npm install`/`npm run build` with real packages, real Recharts and Lucide rendering, and a real Gemini call. Run `npm test` and `npm run build` on your machine.

## Verification performed while building (v1.1)

- 89 unit tests passed (13 files), using a Vitest-compatible test runner. The build environment could not download packages, so the real `vitest` could not be used there.
- Strict `tsc` passed for all non-React code. The React code passed a type-check against simplified React type definitions, because the official ones couldn't be installed.
- 56 automated browser checks passed in headless Chromium (desktop and phone size), using real React 19 with stand-in icon and chart components. They include loading data saved by the SwiftWise AI version.
- The AI server was tested against a local mock of the Gemini API.

## Verification performed while building (v1.0)

- 74 unit tests passed (12 files), using a Vitest-compatible test runner. The build environment could not download packages, so the real `vitest` package could not be used there.
- Strict `tsc` check passed for all non-React code (library, types, reducer, tests).
- 38 automated browser checks passed in headless Chromium, using the real React 19 with stand-in icon and chart components.
- The AI server was tested against a local mock of the Gemini API: health check, valid answer, invalid input, oversized body, wrong key and rate limit.

**Not verified in the build environment:** `npm install`, `npm run build` and `npm test` with the real packages, the real Recharts and Lucide rendering, and a real Gemini API call. Run these yourself after extracting the project (see the README) and add the results below.

## Your own log

| Date | What I changed / practised | Result |
|---|---|---|
| | | |
