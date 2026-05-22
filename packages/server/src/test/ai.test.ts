import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  app = await buildApp();
});

beforeEach(async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { email: 'ai@example.com', password: 'supersecret1234' },
  });
  token = JSON.parse(res.body).token;
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('POST /ai/suggest-tags', () => {
  it('returns 401 without a token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/suggest-tags',
      payload: { url: 'https://example.com', title: 'Example' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns empty tags when AI is not configured', async () => {
    vi.stubEnv('AI_PROVIDER', '');
    vi.stubEnv('AI_API_KEY', '');
    const res = await app.inject({
      method: 'POST',
      url: '/ai/suggest-tags',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://example.com', title: 'Example', description: '', existingTags: [] },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ tags: [] });
  });

  it('returns suggested tags from the AI provider', async () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic');
    vi.stubEnv('AI_API_KEY', 'test-key');

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: '["tech/web", "tools"]' }] }),
    } as Response);

    const res = await app.inject({
      method: 'POST',
      url: '/ai/suggest-tags',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://example.com', title: 'Example', description: 'A web tool', existingTags: [] },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ tags: ['tech/web', 'tools'] });
  });

  it('returns empty tags when the AI provider returns an error', async () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic');
    vi.stubEnv('AI_API_KEY', 'test-key');

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response);

    const res = await app.inject({
      method: 'POST',
      url: '/ai/suggest-tags',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://example.com', title: 'Example' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ tags: [] });
  });
});
