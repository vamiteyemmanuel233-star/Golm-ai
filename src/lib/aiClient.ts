/**
 * Browser-side client for the optional local AI server (server/index.mjs).
 * The browser only ever calls our own /api routes; the API key stays on the server.
 */
import type { AiContext } from './assistant';

export type AiStatus =
  | { state: 'checking' }
  | { state: 'available'; provider: string; model: string }
  | { state: 'unavailable'; reason: string };

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function checkAiStatus(): Promise<AiStatus> {
  try {
    const response = await withTimeout(5000, (signal) => fetch('/api/health', { signal }));
    if (!response.ok) {
      return { state: 'unavailable', reason: 'The AI server is not running. Start it with “npm run server” (see README).' };
    }
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) {
      return { state: 'unavailable', reason: 'The AI server sent an unexpected response.' };
    }
    const { configured, provider, model } = body as Record<string, unknown>;
    if (configured !== true) {
      return { state: 'unavailable', reason: 'The AI server is running but no API key is configured in server/.env.' };
    }
    return { state: 'available', provider: String(provider ?? 'AI provider'), model: String(model ?? 'unknown model') };
  } catch {
    return { state: 'unavailable', reason: 'Could not reach the AI server. Start it with “npm run server” (see README).' };
  }
}

export async function askAi(question: string, context: AiContext, history: ChatTurn[]): Promise<{ answer: string; model: string }> {
  let response: Response;
  try {
    response = await withTimeout(45000, (signal) =>
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, history: history.slice(-6) }),
        signal,
      }),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The AI took too long to respond. Please try again.');
    }
    throw new Error('Could not reach the AI server.');
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // handled below
  }
  const data = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `The AI server returned an error (${response.status}).`);
  }
  if (typeof data.answer !== 'string' || data.answer.trim() === '') {
    throw new Error('The AI returned an empty answer.');
  }
  return { answer: data.answer, model: typeof data.model === 'string' ? data.model : 'unknown model' };
}
