import { describe, expect, it } from 'vitest';
import { createRateLimiter, parseEnv, validateChatRequest } from './validate.mjs';

describe('validateChatRequest', () => {
  it('accepts a valid request and trims history', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `m${i}` }));
    const r = validateChatRequest({ question: '  How am I doing? ', context: { a: 1 }, history });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.question).toBe('How am I doing?');
      expect(r.value.history).toHaveLength(6);
    }
  });

  it('rejects bad input', () => {
    expect(validateChatRequest(null).ok).toBe(false);
    expect(validateChatRequest({ question: '', context: {} }).ok).toBe(false);
    expect(validateChatRequest({ question: 'x'.repeat(501), context: {} }).ok).toBe(false);
    expect(validateChatRequest({ question: 'hi' }).ok).toBe(false);
    expect(validateChatRequest({ question: 'hi', context: {}, history: [{ role: 'system', text: 'x' }] }).ok).toBe(false);
  });
});

describe('createRateLimiter', () => {
  it('blocks after the limit and resets after the window', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(allow('ip', 0)).toBe(true);
    expect(allow('ip', 10)).toBe(true);
    expect(allow('ip', 20)).toBe(false);
    expect(allow('other', 20)).toBe(true);
    expect(allow('ip', 1000)).toBe(true);
  });
});

describe('parseEnv', () => {
  it('reads keys, ignores comments and strips quotes', () => {
    expect(parseEnv('# c\nGEMINI_API_KEY="abc"\nPORT=8787\n\nBAD')).toEqual({ GEMINI_API_KEY: 'abc', PORT: '8787' });
  });
});
