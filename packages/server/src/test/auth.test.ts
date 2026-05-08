import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('POST /auth/signup', () => {
  it('creates a user and returns a token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'test@example.com', password: 'supersecret1234' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toHaveProperty('token');
  });

  it('returns 409 when email is already in use', async () => {
    const payload = { email: 'dupe@example.com', password: 'supersecret1234' };
    await app.inject({ method: 'POST', url: '/auth/signup', payload });
    const res = await app.inject({ method: 'POST', url: '/auth/signup', payload });
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('returns a token with valid credentials', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'login@example.com', password: 'supersecret1234' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'login@example.com', password: 'supersecret1234' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveProperty('token');
  });

  it('returns 401 for wrong password', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'wrong@example.com', password: 'supersecret1234' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'wrong@example.com', password: 'wrongpassword123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'supersecret1234' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('deletes the session and returns 204', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'logout@example.com', password: 'supersecret1234' },
    });
    const { token } = JSON.parse(signup.body);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/logout' });
    expect(res.statusCode).toBe(401);
  });
});
