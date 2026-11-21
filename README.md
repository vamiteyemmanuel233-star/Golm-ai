# GOLM AI

**Smart Finance. Smarter Future.**
By **Vamit Golm Company Limited** · https://vamitgolm.com

GOLM AI is a personal finance coach for everyday earners. People record income and spending, including *how* they paid (Mobile Money, cash, bank or card). GOLM AI turns those records into budgets, savings goals, what-if scenarios and personal coaching. It runs in the browser, keeps data on the user's device and works offline. An optional live AI coach (Google Gemini) explains the user's numbers in plain language.

> **Version 1.2 (hackathon upgrade).** Built on the existing GOLM AI v1.1 app; every v1.1 feature and existing user data are preserved.
> Only enter it in a competition if the organisers allow pre-existing and AI-assisted code.
> GOLM AI does not hold or move money and is not connected to any bank or Mobile Money provider. It gives educational information, **not financial advice**.

---

## 1. Run it (Windows PowerShell in VS Code)

You need **Node.js 20.19 or newer** (22 LTS recommended).

1. Extract `golm-ai-hackathon.zip`.
2. In VS Code, use **File → Open Folder…** and choose the extracted **`golm-ai-hackathon`** folder (the one that contains `package.json`).
3. Open the terminal (**Ctrl + `**) and run:

```powershell
npm install
npm run dev
```

Then open **http://localhost:5173**.

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Start the app (development) | `npm run dev` |
| Run all unit tests | `npm test` |
| Strict TypeScript check | `npm run typecheck` |
| Production build (into `dist/`) | `npm run build` |
| Preview the production build | `npm run preview` |
| Optional live AI server | `npm run server` |

### Optional: live AI coach (Gemini)

```powershell
Copy-Item server\.env.example server\.env
notepad server\.env
```

Add your free key from https://aistudio.google.com/apikey to `GEMINI_API_KEY=`, save, then in a **second** terminal run `npm run server`. In the app, open **AI Coach**, click **Re-check** and give consent.

`server/.env` is git-ignored and is **not** included in the ZIP.

## 2. Features

| | Feature | Works offline |
|---|---|---|
| **New** | **AI financial coach.** Spending analysis, which category to reduce, a realistic savings plan and goal feasibility, calculated by GOLM's formulas. Optional live Gemini coaching explains the same pre-calculated facts. | Formulas: ✅ · Gemini: needs internet + server |
| **New** | **What-if simulator.** Sliders per category, extra income, 3–36 month horizon, the calculation shown line by line, a cumulative chart, and how much sooner a goal is reached. | ✅ |
| **New** | **Smart goals.** Compares goals with the user's average monthly surplus, shows an Achievable / Tight / Not feasible badge, warns when goals need more than the surplus, and answers "Can I reach it by …?" for any month. | ✅ |
| **New** | **Region and currency.** Display in GHS, NGN, KES, USD, GBP or EUR. Symbol only: amounts are **never converted**, because no exchange-rate data is used. | ✅ |
| **New** | **Intro screen** (`#/about`) explaining the problem, how it works and the trust model. | ✅ |
| v1.1 | Dashboard, transactions (with payment method, search, filters, CSV export), budgets, savings goals, analytics, insights, forecast, demo data, light/dark mode, data recovery | ✅ |

## 3. How AI is used (and where it isn't)

| Layer | What it does | Labelled in the app as |
|---|---|---|
| **Financial engine** (`src/lib/`) | All arithmetic: totals, averages, budgets, forecasts, outliers, goal plans, simulator, coach facts. Pure TypeScript, unit-tested. | "Coach formula · calculated on this device — not AI" |
| **Live AI coach** (Gemini via `server/`) | Receives the engine's **pre-calculated** coaching facts and explains them conversationally. It is instructed not to recalculate or invent numbers. | "GOLM AI Coach · live AI (model) · may contain mistakes" |

The AI is used where it adds real value: personalised explanation and prioritisation. The numbers stay deterministic and checkable.

## 4. Privacy and security

- Records are stored only in the browser (localStorage) on the user's device. There is no account system and nothing is uploaded.
- Live AI is **opt-in**: nothing is sent until the user ticks consent. They can preview the exact payload and withdraw consent at any time.
- Only **aggregates** are sent: monthly totals, category and payment-method totals, budgets and goal amounts. Transaction descriptions, goal names, exact dates and IDs are never sent.
- The API key lives only in `server/.env` on the local server and never reaches the browser. The server listens on `127.0.0.1`, validates input, limits request size and rate-limits to 15 requests a minute.

## 5. Data compatibility

Data saved by earlier versions (SwiftWise AI, GOLM AI v1.1) loads unchanged:
- **Storage keys are unchanged.**
- New settings (currency, country) default to Ghana / GHS.
- Older transactions without a payment method show "Not recorded".
- A previously auto-saved dark theme is replaced by the new white default, but a theme the user chose themselves is kept.

## 6. Testing

```powershell
npm test
npm run build
```

Unit tests cover the whole financial engine, including money, dates, budgets, filters, forecast, outliers, recommendations, goals, coach and simulator. They also cover CSV, storage and validation, compatibility with old data, the reducer, the AI summary (privacy checks), currency handling and server input validation. See `docs/DEVLOG.md` for what was verified while building.

## 7. Documentation

| File | Contents |
|---|---|
| `docs/HACKATHON-PITCH.md` | Problem, solution, innovation, 3-minute demo walkthrough, likely judges' questions |
| `docs/ARCHITECTURE.md` | Architecture, data flow, AI design, calculation formulas |
| `docs/DEMO-SCRIPT.md` | Step-by-step live demo checklist |
| `docs/DEVLOG.md` | Development record and verification log |
| `docs/REBUILD-DRILL.md` | Practice drills |

## 8. Updating your existing project and live site

This folder is a complete, separate copy. To update your existing repository:
1. Copy everything from this folder **except** `node_modules` into your existing `golm-ai-practice` folder, replacing files. Keep your own `server/.env`.
2. Run `npm install`, `npm test`, `npm run build`.
3. Then `git add .`, `git commit -m "GOLM AI v1.2"`, `git push`. Vercel redeploys automatically.

No Vercel settings need to change (still Vite / `npm run build` / `dist`).

© 2026 Vamit Golm Company Limited.
