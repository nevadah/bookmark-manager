import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
    payload: { email: 'bookmarks@example.com', password: 'supersecret1234' },
  });
  token = JSON.parse(res.body).token;
});

afterAll(async () => {
  await app.close();
});

describe('GET /bookmarks', () => {
  it('returns an empty array when user has no bookmarks', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/bookmarks' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /bookmarks', () => {
  it('creates a bookmark and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://example.com', title: 'Example', tags: ['test'] },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ url: 'https://example.com', title: 'Example', tags: ['test'] });
    expect(body.id).toBeDefined();
  });

  it('returns 400 for missing required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'No URL' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /bookmarks/:id', () => {
  it('updates specified fields only', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://patch.example.com', title: 'Before', tags: ['old'] },
    });
    const { id } = JSON.parse(create.body);

    const res = await app.inject({
      method: 'PATCH',
      url: `/bookmarks/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'After' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe('After');
    expect(body.tags).toEqual(['old']);
  });

  it('returns 404 for a non-existent bookmark', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/bookmarks/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Ghost' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /bookmarks/:id', () => {
  it('deletes the bookmark and returns 204', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://delete.example.com', title: 'To Delete' },
    });
    const { id } = JSON.parse(create.body);

    const del = await app.inject({
      method: 'DELETE',
      url: `/bookmarks/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({
      method: 'GET',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
    });
    const bookmarks = JSON.parse(get.body);
    expect(bookmarks.find((b: { id: string }) => b.id === id)).toBeUndefined();
  });

  it('returns 404 for a non-existent bookmark', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/bookmarks/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
