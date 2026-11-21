/**
 * HTTP-independent request handlers for the hosted (Vercel) AI endpoints.
 * Kept free of any Vercel-specific API so they can be unit-tested directly.
 */
import { callGemini, geminiConfig, PROVIDER } from './gemini.mjs';
import { createRateLimiter, LIMITS, validateChatRequest } from './validate.mjs';

// Best-effort limit per visitor. On serverless hosting each running instance
// keeps its own counter, so this slows abuse rather than guaranteeing a cap;
// Google's own free-tier quota is the hard limit.
const allow = createRateLimiter({ limit: 10, windowMs: 60_000 });

export function handleHealth(env) {
  const config = geminiConfig(env);
  return { status: 200, body: { configured: config.apiKey.length > 0, provider: PROVIDER, model: config.model } };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ method?: string, contentType?: string, body: unknown, ip: string }} request
 * @param {(config: object, payload: object) => Promise<string>} [ask] injectable for tests
 */
export async function handleChat(env, request, ask = callGemini) {
  if (request.method !== 'POST') return { status: 405, body: { error: 'Use POST.' } };
  const config = geminiConfig(env);
  if (!config.apiKey) return { status: 503, body: { error: 'Live AI is not configured on this server.' } };
  if (!(request.contentType ?? '').includes('application/json')) {
    return { status: 415, body: { error: 'Content-Type must be application/json.' } };
  }
  if (!allow(request.ip || 'unknown')) return { status: 429, body: { error: 'Too many questions. Please wait a minute.' } };

  let body = request.body;
  if (typeof body === 'string') {
    if (body.length > LIMITS.bodyBytes) return { status: 413, body: { error: 'Request is too large.' } };
    try {
      body = JSON.parse(body);
    } catch {
      return { status: 400, body: { error: 'Request body is not valid JSON.' } };
    }
  } else if (JSON.stringify(body ?? null).length > LIMITS.bodyBytes) {
    return { status: 413, body: { error: 'Request is too large.' } };
  }

  const checked = validateChatRequest(body);
  if (!checked.ok) return { status: 400, body: { error: checked.error } };
  try {
    const answer = await ask(config, checked.value);
    return { status: 200, body: { answer, model: config.model, provider: PROVIDER } };
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    return { status, body: { error: error instanceof Error ? error.message : 'Unexpected server error.' } };
  }
}

/** First address in x-forwarded-for, used only for rate limiting (never stored). */
export function clientIp(headers) {
  const forwarded = headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (first ?? '').split(',')[0].trim() || 'unknown';
}

/** Writes a JSON response using plain Node APIs (works on Vercel's Node runtime). */
export function sendJson(res, { status, body }) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}
