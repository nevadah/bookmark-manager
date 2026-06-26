import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { FastifyInstance } from 'fastify';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let app: FastifyInstance;
let adminToken: string;
let memberToken: string;

beforeAll(async () => {
    app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
    const res = await app.inject({
        method: 'POST', url: '/auth/signup',
        payload: { email: 'admin@example.com', password: 'supersecret1234' },
    });
    adminToken = JSON.parse(res.body).token;
    await prisma.user.update({
        where: { email: 'admin@example.com' },
        data: { isSystemAdmin: true },
    });

    const res2 = await app.inject({
        method: 'POST', url: '/auth/signup',
        payload: { email: 'user@example.com', password: 'supersecret1234' },
    });
    memberToken = JSON.parse(res2.body).token;
});

describe('POST /admin/orgs', () => {
    it('creates an org and returns 201', async () => {
        const res = await app.inject({
            method: 'POST', url: '/admin/orgs',
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { name: 'Test Org' },
        });
        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.name).toBe('Test Org');
        expect(body.id).toBeDefined();
    });

    it('returns 400 for missing name', async () => {
        const res = await app.inject({
            method: 'POST', url: '/admin/orgs',
            headers: { authorization: `Bearer ${adminToken}` },
            payload: {},
        });
        expect(res.statusCode).toBe(400);
    });

    it('returns 403 for non-admin user', async () => {
        const res = await app.inject({
            method: 'POST', url: '/admin/orgs',
            headers: { authorization: `Bearer ${memberToken}` },
            payload: { name: 'Test Org' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('returns 401 without a token', async () => {
        const res = await app.inject({ method: 'POST', url: '/admin/orgs', payload: { name: 'Test Org' } });
        expect(res.statusCode).toBe(401);
    });
});

describe('GET /admin/orgs', () => {
    it('returns a list of orgs for admin user', async () => {
        await prisma.organization.create({ data: { name: 'Org 1' } });
        await prisma.organization.create({ data: { name: 'Org 2' } });
        const res = await app.inject({
            method: 'GET', url: '/admin/orgs',
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.length).toBeGreaterThanOrEqual(2);
    });
    it('returns 403 for non-admin user', async () => {
        const res = await app.inject({
            method: 'GET', url: '/admin/orgs',
            headers: { authorization: `Bearer ${memberToken}` },
        });
        expect(res.statusCode).toBe(403);
    });
    it('returns 401 without a token', async () => {
        const res = await app.inject({ method: 'GET', url: '/admin/orgs' });
        expect(res.statusCode).toBe(401);
    });
});

describe ('DELETE /admin/orgs/:id', () => {
    it('deletes an org and returns 204 for admin user', async () => {
        const org = await prisma.organization.create({ data: { name: 'Org to Delete' } });
        const res = await app.inject({
            method: 'DELETE', url: `/admin/orgs/${org.id}`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(204);
    });
});

describe('GET /admin/users', () => {
    it('returns a list of users for admin user', async () => {
        const res = await app.inject({
            method: 'GET', url: '/admin/users',
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.length).toBeGreaterThanOrEqual(2);
    });
    it('returns 403 for non-admin user', async () => {
        const res = await app.inject({
            method: 'GET', url: '/admin/users',
            headers: { authorization: `Bearer ${memberToken}` },
        });
        expect(res.statusCode).toBe(403);
    });
    it('returns 401 without a token', async () => {
        const res = await app.inject({ method: 'GET', url: '/admin/users' });
        expect(res.statusCode).toBe(401);
    });
});
