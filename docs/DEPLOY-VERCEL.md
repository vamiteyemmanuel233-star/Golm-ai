# Live AI Coach on Vercel — setup guide

## Why Live AI was unavailable on the website

The AI code lived only in `server/index.mjs`, a small Node program you start with `npm run server`. It runs on **your computer**. Vercel hosted only the static app, so when the live site called `/api/health` and `/api/chat`, nothing on Vercel answered. The app then correctly showed "Live AI unavailable".

## What changed (v1.2.1)

| File | Purpose |
|---|---|
| `api/health.js` | Vercel serverless function: `GET /api/health`. Says whether live AI is configured (never reveals the key). |
| `api/chat.js` | Vercel serverless function: `POST /api/chat`. Validates the request and asks Gemini. |
| `server/gemini.mjs` | Shared Gemini prompt and API call, used by **both** Vercel and your local server. |
| `server/handlers.mjs` | Shared request handling: validation, size limit, per-visitor rate limit (10 per minute), friendly errors. |
| `server/index.mjs` | Local server, now reusing the shared code. `npm run server` still works exactly as before. |

The browser still only calls `/api/...` on the same website, so there are no CORS issues. The API key exists only in Vercel's environment variables and is never sent to the browser.

## One-time setup in Vercel (about 2 minutes)

1. Open https://vercel.com → your **golm-ai** project → **Settings → Environment Variables**.
2. Add:
   - **Key:** `GEMINI_API_KEY` · **Value:** your key from https://aistudio.google.com/apikey · **Environments:** Production (and Preview if you like)
   - Optional: **Key:** `GEMINI_MODEL` · **Value:** `gemini-3.5-flash-lite` (or another model your key can use)
3. Click **Save**.

Environment variables apply to **new** deployments only. Add the key *before* you push, or click **Deployments → … → Redeploy** afterwards.

No other Vercel settings change: Framework stays **Vite**, Build Command `npm run build`, Output `dist`. Vercel automatically detects the `api/` folder.

## Check it works

1. Open `https://golm-ai.vercel.app/api/health`. You should see `{"configured":true,...}`.
   - `"configured":false` means the key isn't set, or you haven't redeployed since adding it.
   - A 404 page means the new code isn't deployed yet.
2. Open the site → **AI Coach** → **Re-check**. The badge should say "Live AI available · consent needed".
3. Tick consent → **Enable live AI** → tap a blue **Ask the live AI coach** button.

## Costs, quota and safety

- On Google's **free tier** with billing **off**, you can't be charged. When the daily or minute quota runs out, visitors see a friendly "rate limit reached, try again shortly" message, and formula coaching keeps working.
- Anyone who visits your public site can use your quota (after giving consent). The per-visitor limit slows abuse, but it isn't a hard cap on serverless hosting. Google's quota is the real limit.
- On the free tier, Google may use submitted content to improve its products. The consent screen tells users this. Only totals are sent, never descriptions, goal names, dates or IDs.
- If your key is ever exposed, delete it in Google AI Studio, create a new one and update it in Vercel.

## Troubleshooting

| What you see | Fix |
|---|---|
| "AI service is running but no API key is configured" | Add `GEMINI_API_KEY` in Vercel, then **Redeploy** |
| "The API key was rejected" | The key was copied wrongly or deleted; paste a fresh key in Vercel, then Redeploy |
| "The model … was not found" | Set `GEMINI_MODEL` to a model listed in Google AI Studio, then Redeploy |
| "free-tier rate limit was reached" | Wait a minute (or until the next day for daily quota) |
| "took too long to respond" | Try again; check Vercel → Logs for details |
