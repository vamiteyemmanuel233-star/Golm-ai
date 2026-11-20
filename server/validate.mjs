// Request validation for the AI server. Kept separate so it can be unit-tested.

export const LIMITS = {
  bodyBytes: 32 * 1024,
  questionChars: 500,
  historyTurns: 6,
  historyChars: 2000,
  contextChars: 16 * 1024,
};

/**
 * Validates and cleans a /api/chat request body.
 * @param {unknown} body
 * @returns {{ ok: true, value: { question: string, context: object, history: {role: 'user'|'assistant', text: string}[] } } | { ok: false, error: string }}
 */
export function validateChatRequest(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const { question, context, history = [] } = /** @type {Record<string, unknown>} */ (body);

  if (typeof question !== 'string' || question.trim() === '') {
    return { ok: false, error: 'Please type a question.' };
  }
  if (question.length > LIMITS.questionChars) {
    return { ok: false, error: `Questions must be under ${LIMITS.questionChars} characters.` };
  }
  if (typeof context !== 'object' || context === null || Array.isArray(context)) {
    return { ok: false, error: 'Missing financial summary.' };
  }
  if (JSON.stringify(context).length > LIMITS.contextChars) {
    return { ok: false, error: 'Financial summary is too large.' };
  }
  if (!Array.isArray(history)) {
    return { ok: false, error: 'History must be a list.' };
  }

  const cleanHistory = [];
  for (const turn of history.slice(-LIMITS.historyTurns)) {
    if (
      typeof turn !== 'object' || turn === null ||
      (turn.role !== 'user' && turn.role !== 'assistant') ||
      typeof turn.text !== 'string'
    ) {
      return { ok: false, error: 'History contains an invalid message.' };
    }
    cleanHistory.push({ role: turn.role, text: turn.text.slice(0, LIMITS.historyChars) });
  }

  return { ok: true, value: { question: question.trim(), context, history: cleanHistory } };
}

/** Simple in-memory fixed-window rate limiter (per client IP). */
export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map();
  return function allow(key, now = Date.now()) {
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}

/** Reads KEY=VALUE lines from a .env file's text (no dependency needed). */
export function parseEnv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}
