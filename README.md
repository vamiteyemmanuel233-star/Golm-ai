# GOLM AI

**Smart Finance. Smarter Future.**
Powered by **Vamit Golm Company Limited** · https://vamitgolm.com

GOLM AI is a personal-finance app for Ghana. It tracks income and spending in Ghana cedis (GH₵) by cash, Mobile Money, bank or card, sets monthly budgets and savings goals, and gives clear insights from your own data. An optional AI assistant runs on Google Gemini.

> **Status:** practice build, version 1.1 (20 November 2026). It was rebranded from the earlier *SwiftWise AI* practice project.
> GOLM AI is **not** connected to, affiliated with or endorsed by any bank, Mobile Money provider, regulator or hackathon organiser. It does not hold or move money, and it gives educational information, **not financial advice**.
> Only submit it to a competition if the organisers explicitly allow pre-built code.

---

## 1. Run it (Windows PowerShell in VS Code)

You need **Node.js 20.19 or newer** (22 LTS recommended). Check with `node -v`.

1. Extract `golm-ai-practice.zip` into its own folder.
2. In VS Code, use **File → Open Folder…** and choose the extracted **`golm-ai-practice`** folder.
3. Open the terminal (**Ctrl + `**) and run:

```powershell
npm install
npm run dev
```

4. Open **http://localhost:5173** (or the address Vite prints).
5. Click **Load demo data** to explore, or **Add first transaction** to start with your own entries.

Everything works offline, with **no API key**. Only the free-form AI chat needs the optional setup in section 3.

**Check it builds and the tests pass:**

```powershell
npm test
npm run build
```

## 2. What it does

| Feature | What it solves |
|---|---|
| **Dashboard** | See this month's income, spending, savings and savings rate at a glance, compared with last month |
| **Transactions** | Record every cedi with its payment method (**Mobile Money, cash, bank, card**); search, filter and export to CSV for records or tax |
| **Budgets** | Set monthly limits per category; get warned at 85% and alerted when over |
| **Savings goals** *(new)* | Plan for school fees, a rent advance, an emergency fund or a business. GOLM AI shows progress and **how much to set aside each month** to hit your date |
| **Emergency-fund suggestion** *(new)* | Suggests a fund of about 3 months of your own average spending |
| **How you pay** *(new)* | Shows how much of your spending goes through Mobile Money vs cash vs bank vs card |
| **Analytics** | 6 or 12-month cash flow, category breakdown, spending trend with forecast, budget use, monthly table |
| **Insights** | Unusual expenses, overspending, low savings, rising spending — each with the rule behind it |
| **GOLM Assistant** | Instant quick answers calculated on your device, plus optional live AI chat (Google Gemini) behind explicit consent |
| **Settings** | Light/dark theme, demo data, export, delete all data, AI consent, roadmap |

### Planned (not built)

Mobile Money import, bank connections, money transfers and payments, business finance, and advanced AI planning are listed in the app as **"Planned — not available yet"**. No integration with any provider exists, and payment features would need the proper licences and partners first.

## 3. Optional: live AI with Google Gemini (free tier)

1. Get a free API key at https://aistudio.google.com/apikey. Free-tier limits and terms change, so check https://ai.google.dev/pricing.
2. Create your settings file and paste the key into it:

```powershell
Copy-Item server\.env.example server\.env
notepad server\.env
```

3. In a **second** terminal, run:

```powershell
npm run server
```

4. In the app, open **Assistant**, click **Re-check**, read the privacy notice, tick the box and click **Enable live AI**.

**Privacy and security**
- The key stays in `server/.env`, which is excluded by `.gitignore` and not included in the ZIP.
- The server only listens on your own computer, validates requests and limits them to 15 per minute.
- Only totals are sent to Google, never descriptions, goal names, dates or IDs. You can preview the exact data on the Assistant page.
- If the server isn't running, the app clearly says live AI is unavailable. It never fakes AI answers.

If the model name stops working, set `GEMINI_MODEL` in `server/.env` to a model listed in Google AI Studio.

## 4. Your existing data is safe

GOLM AI reads data from the same browser storage the SwiftWise AI version used, so records you entered before the rebrand are still there.

Older records simply show **"Not recorded"** as their payment method until you edit them. The storage keys keep their original names on purpose: renaming them would hide existing records.

## 5. Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the app with hot reload |
| `npm test` | Run all unit tests |
| `npm run typecheck` | Strict TypeScript check |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run server` | Start the optional AI server |

## 6. How the numbers are calculated (no hidden AI)

| Item | Formula |
|---|---|
| Savings rate | (income − expenses) ÷ income |
| Budget alert | spent ÷ limit: warning ≥ 85%, over budget > 100% |
| Goal plan | monthly amount = ⌈(target − saved) ÷ months left⌉ (at least 1 month) |
| Emergency fund | 3 × average monthly spending of up to 3 recent complete months, rounded up to GH₵10 |
| Unusual expense | modified z-score 0.6745 × (amount − median) ÷ MAD above 3.5 within a category (needs 5+ expenses) |
| Forecast | weighted moving average of up to 3 complete months (weights 1, 2, 3) + linear trend for comparison |

All money is stored as whole **pesewas** (GH₵1 = 100), so totals are exact.

## 7. Project structure

```
src/brand.ts              Name, tagline, company, links and roadmap: one place to rebrand or extend
src/lib/                  Pure, unit-tested logic: money, dates, finance, goals, payment methods,
                          insights, forecast, CSV, storage, validation, demo data, assistant
src/state/                Data store (reducer + React context)
src/components/           Reusable UI pieces
src/features/             One folder per page: dashboard, transactions, budgets, goals,
                          analytics, insights, assistant, settings
src/styles/               Design tokens (colours, spacing) and app styles
server/                   Optional Gemini AI server (Node built-ins only, no extra packages)
docs/                     Demo script, development log, rebuild drill
```

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `npm` is not recognised | Install Node.js LTS from nodejs.org and reopen VS Code |
| "running scripts is disabled" | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once |
| Node version too old | Install Node 22 LTS |
| Assistant says the AI server is not running | Run `npm run server` in a second terminal, then click **Re-check** |
| "API key was rejected" / "model not found" | Check `GEMINI_API_KEY` / `GEMINI_MODEL` in `server/.env` and restart the server |

© 2026 Vamit Golm Company Limited. Practice build — do not present it as work done during an official competition.
