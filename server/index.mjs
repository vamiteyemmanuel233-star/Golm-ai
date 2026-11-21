/**
 * GOLM AI — optional local AI server (Vamit Golm Company Limited).
 *
 * WHY A SERVER? An API key placed in browser code can be copied by anyone who
 * opens the page. This small Node server keeps the key in server/.env, adds
 * input validation and rate limiting, and forwards questions to Google's
 * Gemini API. The React app talks only to /api on this server (via Vite's proxy).
 *
 * Uses only built-in Node modules (Node 20.19+): no extra dependencies.
 * Run with:  npm run server
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRateLimiter, LIMITS, parseEnv, validateChatRequest } from './validate.mjs';
import { callGemini, geminiConfig, PROVIDER } from './gemini.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, '.env');
const fileEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const env = { ...fileEnv, ...process.env };

const config = geminiConfig(env);
const API_KEY = config.apiKey;
const MODEL = config.model;
const PORT = Number(env.AI_SERVER_PORT ?? 8787);
const HOST = '127.0.0.1'; // local only — never exposed to your network

const allow = createRateLimiter({ limit: 15, windowMs: 60_000 });



function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > LIMITS.bodyBytes) {
        tooLarge = true; // keep reading (and discarding) so we can still reply
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Request is too large.'), { status: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Request body is not valid JSON.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { configured: API_KEY.length > 0, provider: PROVIDER, model: MODEL });
  }

  if (url.pathname === '/api/chat') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
    if (!API_KEY) return send(res, 503, { error: 'No API key configured. Add GEMINI_API_KEY to server/.env and restart the server.' });
    if (!(req.headers['content-type'] ?? '').includes('application/json')) {
      return send(res, 415, { error: 'Content-Type must be application/json.' });
    }
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!allow(ip)) return send(res, 429, { error: 'Too many questions. Please wait a minute.' });

    try {
      const body = await readJson(req);
      const checked = validateChatRequest(body);
      if (!checked.ok) return send(res, 400, { error: checked.error });
      const answer = await callGemini(config, checked.value);
      return send(res, 200, { answer, model: MODEL, provider: PROVIDER });
    } catch (error) {
      const status = typeof error?.status === 'number' ? error.status : 500;
      return send(res, status, { error: error instanceof Error ? error.message : 'Unexpected server error.' });
    }
  }

  return send(res, 404, { error: 'Not found.' });
});

server.listen(PORT, HOST, () => {
  console.log(`GOLM AI server listening on http://${HOST}:${PORT}`);
  console.log(API_KEY ? `Provider: ${PROVIDER} · model: ${MODEL}` : 'No GEMINI_API_KEY found — live AI will show as unavailable. See README.');
});
