# GOLM AI — Hackathon Pitch Pack

**GOLM AI · Smart Finance. Smarter Future.** — by Vamit Golm Company Limited

> Disclose honestly: say when it was built and whether pre-existing or AI-assisted code was used, as the hackathon rules require.

## 1. The problem (30 seconds)

Many everyday earners are paid in one lump sum and spend through many channels: Mobile Money, cash, transfers and cards. Money disappears without a clear picture of where it went. Popular budgeting tools often assume one bank account, foreign currencies, or give generic tips that ignore the person's real numbers. Without that picture, people can't tell whether a goal like school fees, rent or an emergency fund is realistic.

## 2. The solution

GOLM AI is a personal finance **coach** that works from the user's own records:
1. **Record**: income and expenses by category *and* payment method.
2. **Understand**: budgets, unusual expenses and trends, each with its formula.
3. **Plan**: the What-if simulator, smart savings goals and an AI coach.

## 3. What makes it innovative

1. **Trustworthy AI design.** The financial engine does every calculation; live Gemini only *explains* pre-calculated facts. Each answer is labelled as either "formula — not AI" or "live AI", so judges and users always know which is which.
2. **What-if simulator.** People can test a decision ("cut food by 20%") and immediately see the monthly and yearly saving and how much sooner a goal is reached. It works offline.
3. **Reality check on goals.** Each goal is compared with the user's actual average surplus. The app warns when goals need more money than the person usually has left, and suggests extending the date, lowering the target or cutting spending.
4. **Built for how people pay.** Mobile Money, cash, bank and card are tracked side by side, with six display currencies for expansion beyond Ghana.
5. **Privacy-first and offline.** Data stays on the device. The AI receives only totals after consent, and the user can preview exactly what is sent.

## 4. Three-minute demo walkthrough (reliable path)

**Before:** Settings → **Delete all data**, then About → **Try it with demo data**. Start the AI server if you'll show live AI.

| Time | Show | Say |
|---|---|---|
| 0:00 | **About** page | Problem and solution in one sentence each. |
| 0:25 | **Dashboard** | Income, spending, savings rate, and the demo-data banner (honest labelling). |
| 0:45 | **Transactions** → add *45.50 Transport, Mobile Money*; filter Method → Mobile Money | "We track how people actually pay." |
| 1:10 | **What-if**: set Food to 20% | "GH₵ × 20% = monthly saving, × 12 months; the emergency fund is reached sooner." Point to the calculation card. |
| 1:45 | **Goals**: affordability card; School fees → "Can I reach it by December?" | "It checks goals against what you really have left." |
| 2:15 | **AI Coach**: tap "Which expense should I reduce?" (formula), then a live Gemini prompt | "Formulas do the maths; AI explains. Every answer is labelled." Open *Preview exactly what would be sent*. |
| 2:45 | Settings: currency → KES; dark mode | "Ready for more markets; symbol only, no fake exchange rates." |
| 3:00 | Close | "GOLM AI helps people see their money clearly and plan with confidence." |

**Backup:** if the internet or the AI fails, use the formula coach answers. They work offline.

## 5. Likely judges' questions

| Question | Accurate answer |
|---|---|
| Where is the AI? | Two layers. Deterministic engine for all numbers (outlier detection, forecasting, goal feasibility, savings plans), and live Google Gemini for personalised coaching that explains those numbers. The app labels which is which. |
| Isn't the "AI" just rules? | The insights and coach formulas are rules and statistics, and we say so. The live coach is a real language model (Gemini), but we deliberately keep arithmetic out of it so the numbers are always correct. |
| How do you stop the AI giving wrong numbers? | It receives pre-calculated facts and is instructed not to recalculate, invent figures, or promise returns. Answers are labelled "may contain mistakes". |
| What data does the AI see? | Only totals, after explicit consent. Never descriptions, goal names, exact dates or IDs. The user can preview the exact payload. |
| Where is data stored? | Only in the user's browser on their device. There is no server database and no account. |
| Does it work offline? | Yes: tracking, budgets, goals, What-if and formula coaching. Only live Gemini needs internet. |
| Is the API key safe? | It's kept in a server-side `.env` file and never sent to the browser. The server validates input and rate-limits requests. |
| Does it connect to Mobile Money or banks? | No. It records the payment method. Integrations are on the roadmap and would need licensed partners and regulatory approval. |
| How accurate are the calculations? | Money is stored as integers, so totals are exact. The engine is covered by automated unit tests, and the formulas are shown on screen. |
| How will it make money? | A free core app, with possible paid tiers later (cloud backup, advanced coaching, a small-business version) and programmes with schools, NGOs and savings groups. These are plans, not current revenue. |
| What about other countries? | Six display currencies today, with no conversion. Next steps are localisation, local payment methods and country-specific compliance. |
| What's next? | Cloud sync with accounts, Mobile Money statement import, bill reminders and a small-business mode. |

## 6. Honest limitations (say them before judges find them)

- Data is per device and browser; there is no sync yet.
- Live AI needs the local server and a Gemini key; the deployed static site shows "Live AI unavailable".
- The flexible/essential category split and the 20% savings target are general guidelines, not personal advice.
- Currency choice changes the symbol only.
