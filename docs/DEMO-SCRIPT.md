# GOLM AI — Demo and presentation script (about 4½ minutes)

> **For the v1.2 hackathon demo, use the 3-minute walkthrough in `HACKATHON-PITCH.md`.** It covers the AI Coach, What-if simulator and smart goals. This longer script remains for practice.

**GOLM AI · Smart Finance. Smarter Future.** Powered by Vamit Golm Company Limited.

> Practice project. If you present it, say clearly that it was built **before** the event as practice, unless the organisers have approved reusing it.

## Before you present (checklist)

- [ ] `npm run dev` is running; the browser is open at http://localhost:5173
- [ ] (Optional) `npm run server` is running with a valid key, and you have already ticked consent on the Assistant page
- [ ] Settings → **Delete all data**, then **Load demo data** (a clean, predictable dataset)
- [ ] Browser zoom at 110–125% so judges can read the screen
- [ ] A backup plan: if the AI fails, use the quick questions (they always work offline)

## 0:00 — The problem (20 s)

"Many people in Ghana handle money across mobile money, cash and bank accounts, and few track where it goes. GOLM AI turns everyday income and expenses — whether paid by Mobile Money, cash, bank or card — into clear budgets, savings plans, early warnings and plain-English guidance, all in Ghana cedis."

## 0:20 — Dashboard (40 s)

- Point to the **demo banner**: "This is clearly marked demonstration data, not real records."
- Walk through income, expenses, net savings and the savings rate. Mention the comparison with last month.
- Cash-flow chart, top spending, budget snapshot.

## 1:00 — Transactions (40 s)

- Click **Add transaction**. Submit it empty to show the validation, then add *GH₵45.50 Transport "Trotro to Madina"* paid with **Mobile Money**.
- Filter by **Method → Mobile Money**: "You can see exactly how much moves through MoMo."
- Search "groceries", filter to *Income*, then **Export CSV**.
- Edit a row, then delete one to show the **confirmation dialog**.

## 1:40 — Budgets and insights (60 s)

- Budgets: Transport is **over budget** (red), and the 85% warning shows in amber.
- Insights: open **"How was this calculated?"** on a recommendation.
  "Every insight shows its rule. We don't pretend formulas are AI."
- Unusual expense: the *Airport taxi* is about 12× the typical transport cost, detected with a robust median-based test.
- Forecast: show the weighted-average formula on screen. "It is labelled as an estimate, not a promise."

## 2:40 — Savings goals (30 s)

- Open **Goals**: "School fees next semester — GOLM AI says how much to save each month to make the date."
- Click **Add** on the emergency fund to add GH₵300.
- "With no goals yet, it suggests an emergency fund of about 3 months of your own spending."

## 3:10 — GOLM AI Coach (50 s)

- Click a quick question: "This answer is calculated locally and labelled *not AI*."
- If live AI is on: ask "How can I reduce my transport costs?" Point to the **Live AI** label and model name.
- Open **Preview exactly what would be sent**: "Only totals leave the device, never descriptions. The API key stays on the server, and the user has to opt in."

## 4:00 — Quality and close (30 s)

- Switch to dark mode, then shrink the window to show the mobile layout.
- "Strict TypeScript, unit tests on every calculation, accessible forms and dialogs, and it works offline."
- Settings → **Coming to GOLM AI**: "Mobile Money import and bank connections are on the roadmap, clearly marked as planned — we don't pretend they exist."
- Close: "GOLM AI helps people see their money clearly, plan for what matters and act before they overspend. Smart Finance. Smarter Future."

## Likely judge questions

| Question | Short answer |
|---|---|
| Is the forecast AI? | No. It is a weighted moving average with weights 1-2-3, plus a linear trend for comparison. Both are shown on screen. |
| How do you protect user data? | Data stays in the browser. AI is opt-in, and only aggregates are sent through a local server that holds the key. |
| Why integers for money? | Floating-point maths creates rounding errors; pesewas as integers are exact. |
| What would you build next? | Mobile Money statement import, bill reminders, business bookkeeping, multi-device sync with real authentication — see the roadmap in Settings. |
| Do you connect to MoMo or banks? | Not yet. GOLM AI records the payment method only. Integrations are planned and would need licensed partners. |
| How do you know the numbers are right? | Unit tests check every calculation, and the Analytics table shows the raw figures behind each chart. |
