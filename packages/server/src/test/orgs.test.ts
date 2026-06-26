import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let app: FastifyInstance;
let adminToken: string;
let memberToken: string;
let outsiderToken: string;
let orgId: string;

beforeAll(async () => {
    app = await buildApp();
});

afterAll(async () => {
    await app.close();
});

beforeEach(async () => {
    // Create org directly via Prisma
    const org = await prisma.organization.create({ data: { name: 'Test Org' } });
    orgId = org.id;

    // Sign up admin, add as org ADMIN
    const r1 = await app.inject({ method: 'POST', url: '/auth/signup',
        payload: { email: 'orgadmin@example.com', password: 'supersecret1234' } });
    adminToken = JSON.parse(r1.body).token;
    const adminUser = await prisma.user.findUnique({ where: { email: 'orgadmin@example.com' } });
    await prisma.orgMembership.create({ data: { orgId, userId: adminUser!.id, role: 'ADMIN' } });

    // Sign up member, add as org MEMBER
    const r2 = await app.inject({ method: 'POST', url: '/auth/signup',
        payload: { email: 'member@example.com', password: 'supersecret1234' } });
    memberToken = JSON.parse(r2.body).token;
    const memberUser = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
    await prisma.orgMembership.create({ data: { orgId, userId: memberUser!.id, role: 'MEMBER' } });

    // Sign up outsider (no org membership)
    const r3 = await app.inject({ method: 'POST', url: '/auth/signup',
        payload: { email: 'outsider@example.com', password: 'supersecret1234' } });
    outsiderToken = JSON.parse(r3.body).token;
});

describe('GET /orgs/:id', () => {
    it('returns org for a member', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/orgs/${orgId}`,
            headers: { authorization: `Bearer ${memberToken}` },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.id).toBe(orgId);
        expect(body.name).toBe('Test Org');
    });

    it('returns org for an org admin', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/orgs/${orgId}`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.id).toBe(orgId);
        expect(body.name).toBe('Test Org');
    });

    it('retuns 403 for a non-member', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/orgs/${orgId}`,
            headers: { authorization: `Bearer ${outsiderToken}` },
        });
        expect(res.statusCode).toBe(403);
    });

    it('returs 401 without a token', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/orgs/${orgId}`,
        });
        expect(res.statusCode).toBe(401);
    });
});

describe('GET /orgs/:id/members', () => {
    it('returns member list for org admin', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/orgs/${orgId}/members`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.length).toBe(2);
        const emails = body.map((m: { user: { email: string } }) => m.user.email);
        expect(emails).toContain('orgadmin@example.com');
        expect(emails).toContain('member@example.com');
    });

    it('returns 403 for regular member', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/orgs/${orgId}/members`,
            headers: { authorization: `Bearer ${memberToken}` },
        });
        expect(res.statusCode).toBe(403);
    });

    it('returns 403 for non-member', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/orgs/${orgId}/members`,
            headers: { authorization: `Bearer ${outsiderToken}` },
        });
        expect(res.statusCode).toBe(403);
    });

    it('returns 401 without a token', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/orgs/${orgId}/members`,
        });
        expect(res.statusCode).toBe(401);
    });
});

describe('POST /orgs/:id/members', () => {
    it('adds a new member for org admin', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/members`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { email: 'outsider@example.com', role: 'MEMBER' },
        });
        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.orgId).toBe(orgId);
        expect(body.role).toBe('MEMBER');
        expect(body.userId).toBeDefined();

    });

    it('returns 409 on duplicate member', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/members`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { email: 'member@example.com', role: 'MEMBER' },
        });
        expect(res.statusCode).toBe(409);
    });

    it('returns 403 for regular member', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/members`,
            headers: { authorization: `Bearer ${memberToken}` },
            payload: { email: 'newmember@example.com', role: 'MEMBER' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('returns 404 for non-existent user', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/members`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { email: 'nonexistent@example.com', role: 'MEMBER' },
        });
        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without a token', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/members`,
            payload: { email: 'newmember@example.com', role: 'MEMBER' },
        });
        expect(res.statusCode).toBe(401);
    });
});

describe('DELETE /orgs/:id/members/:userId', () => {
    it('removes a member for org admin', async () => {
        const memberUser = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
        if (!memberUser) throw new Error('Member user not found');
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/members/${memberUser.id}`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(204);
    });

    it('returns 403 for regular member', async () => {
        const memberUser = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
        if (!memberUser) throw new Error('Member user not found');
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/members/${memberUser.id}`,
            headers: { authorization: `Bearer ${memberToken}` },
        });
        expect(res.statusCode).toBe(403);
    });

    it('returns 404 for non-existent membership', async () => {
        const outsiderUser = await prisma.user.findUnique({ where: { email: 'outsider@example.com' } });
        if (!outsiderUser) throw new Error('Outsider user not found');
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/members/${outsiderUser.id}`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without a token', async () => {
        const memberUser = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
        if (!memberUser) throw new Error('Member user not found');
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/members/${memberUser.id}`,
        });
        expect(res.statusCode).toBe(401);
    });
});

describe('PATCH /orgs/:id/members/:userId', () => {
    it('updates a member role for org admin', async () => {
        const memberUser = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
        if (!memberUser) throw new Error('Member user not found');
        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/members/${memberUser.id}`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { role: 'ADMIN' },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.role).toBe('ADMIN');
    });
    
    it('returns 403 for regular member', async () => {
        const memberUser = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
        if (!memberUser) throw new Error('Member user not found');
        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/members/${memberUser.id}`,
            headers: { authorization: `Bearer ${memberToken}` },
            payload: { role: 'ADMIN' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('returns 404 for non-existent membership', async () => {
        const outsiderUser = await prisma.user.findUnique({ where: { email: 'outsider@example.com' } });
        if (!outsiderUser) throw new Error('Outsider user not found');
        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/members/${outsiderUser.id}`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { role: 'ADMIN' },
        });
        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without a token', async () => {
        const memberUser = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
        if (!memberUser) throw new Error('Member user not found');
        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/members/${memberUser.id}`,
            payload: { role: 'ADMIN' },
        });
        expect(res.statusCode).toBe(401);
    });
});
