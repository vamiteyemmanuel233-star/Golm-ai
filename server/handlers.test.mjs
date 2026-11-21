import { describe, expect, it } from 'vitest';
import { clientIp, handleChat, handleHealth } from './handlers.mjs';

const env = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'test-model' };
const valid = { question: 'How am I doing?', context: { a: 1 }, history: [] };
const req = (over = {}) => ({ method: 'POST', contentType: 'application/json', body: valid, ip: `ip-${Math.random()}`, ...over });
const fakeAsk = async (config, payload) => `answer for ${payload.question} via ${config.model}`;

describe('hosted AI handlers', () => {
  it('reports configuration without revealing the key', () => {
    expect(handleHealth(env)).toEqual({ status: 200, body: { configured: true, provider: 'Google Gemini', model: 'test-model' } });
    expect(handleHealth({}).body.configured).toBe(false);
    expect(JSON.stringify(handleHealth(env)).includes('"k"')).toBe(false);
  });

  it('answers a valid request (object or string body)', async () => {
    const r1 = await handleChat(env, req(), fakeAsk);
    expect(r1.status).toBe(200);
    expect(r1.body.answer).toBe('answer for How am I doing? via test-model');
    const r2 = await handleChat(env, req({ body: JSON.stringify(valid) }), fakeAsk);
    expect(r2.status).toBe(200);
  });

  it('rejects bad requests', async () => {
    expect((await handleChat(env, req({ method: 'GET' }), fakeAsk)).status).toBe(405);
    expect((await handleChat({}, req(), fakeAsk)).status).toBe(503);
    expect((await handleChat(env, req({ contentType: 'text/plain' }), fakeAsk)).status).toBe(415);
    expect((await handleChat(env, req({ body: '{bad' }), fakeAsk)).status).toBe(400);
    expect((await handleChat(env, req({ body: { question: '' , context: {} } }), fakeAsk)).status).toBe(400);
    expect((await handleChat(env, req({ body: 'x'.repeat(40000) }), fakeAsk)).status).toBe(413);
  });

  it('passes provider errors through without crashing', async () => {
    const failing = async () => { throw Object.assign(new Error('The free-tier rate limit was reached.'), { status: 502 }); };
    const r = await handleChat(env, req(), failing);
    expect(r).toEqual({ status: 502, body: { error: 'The free-tier rate limit was reached.' } });
  });

  it('rate-limits one visitor', async () => {
    const ip = 'same-visitor';
    const statuses = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await handleChat(env, req({ ip }), fakeAsk)).status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(10);
    expect(statuses[10]).toBe(429);
  });

  it('reads the client address from x-forwarded-for', () => {
    expect(clientIp({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })).toBe('1.2.3.4');
    expect(clientIp({})).toBe('unknown');
  });
});
