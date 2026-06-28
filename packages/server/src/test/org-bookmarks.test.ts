import { Bookmark, PrismaClient } from '@prisma/client';
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

describe('POST /orgs/:id/bookmarks', () => {
    it('should allow org admins to create bookmarks', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/bookmarks`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { url: 'https://example.com', title: 'Example' },
        });
        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body).toMatchObject({ url: 'https://example.com', title: 'Example', orgId });
    });

    it('should return 400 if payload missing required fields', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/bookmarks`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { url: 'https://example.com' },
        });
        expect(res.statusCode).toBe(400);
    });

    it('should return 403 if an org member tries creating bookmarks', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/bookmarks`,
            headers: { authorization: `Bearer ${memberToken}` },
            payload: { url: 'https://example.com', title: 'Example' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('should return 403 for a non-org-admin', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/bookmarks`,
            headers: { authorization: `Bearer ${outsiderToken}` },
            payload: { url: 'https://example.com', title: 'Example' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('should return 401 without a token', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/orgs/${orgId}/bookmarks`,
            payload: { url: 'https://example.com', title: 'Example' },
        });
        expect(res.statusCode).toBe(401);
    });
});

describe('PATCH /orgs/:id/bookmarks/:bookmarkId', () => {

    let bookmark: Bookmark;
    let bookmarkId: string;

    beforeEach(async () => {
        bookmark = await prisma.bookmark.create({
            data: { url: 'https://example.com', title: 'Patch Example', orgId },
        });
        bookmarkId = bookmark.id;
    });

    it('should update an org bookmark', async () => {

        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/bookmarks/${bookmarkId}`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { url: 'https://example2.com', title: 'Modified Example'}
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.id).toBe(bookmark.id);
        expect(body.url).toBe('https://example2.com');
        expect(body.title).toBe('Modified Example');
        expect(body.orgId).toBe(orgId);
        expect(new Date(body.updatedAt).getTime()).toBeGreaterThanOrEqual(bookmark.updatedAt.getTime());
    });

    it('should return 403 for a non-admin org member', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/bookmarks/${bookmarkId}`,
            headers: { authorization: `Bearer ${memberToken}` },
            payload: { url: 'https://example.com', title: 'Example' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('should return 403 for a non-org-member', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/bookmarks/${bookmarkId}`,
            headers: { authorization: `Bearer ${outsiderToken}` },
            payload: { url: 'https://example.com', title: 'Example' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent bookmark', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/bookmarks/00000000-0000-0000-0000-000000000000`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { url: 'https://example2.com', title: 'Modified Example'}
        });
        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without a token', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: `/orgs/${orgId}/bookmarks/${bookmarkId}`,
            payload: { url: 'https://example.com', title: 'Example' },
        });
        expect(res.statusCode).toBe(401);
    });
});

describe('DELETE /orgs/:id/bookmarks/:bookmarkId', () => {

    let bookmarkId: string;

    beforeEach(async () => {
        const bookmark = await prisma.bookmark.create({
            data: { url: 'https://example.com', title: 'Patch Example', orgId },
        });
        bookmarkId = bookmark.id;
    });

    it('should delete an org bookmark', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/bookmarks/${bookmarkId}`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(204);
    });

    it('should return 403 for a non-admin org member', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/bookmarks/${bookmarkId}`,
            headers: { authorization: `Bearer ${memberToken}` },
        });
        expect(res.statusCode).toBe(403);
    });

    it('should return 403 for a non-org-admin', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/bookmarks/${bookmarkId}`,
            headers: { authorization: `Bearer ${outsiderToken}` },
        });
        expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent bookmark', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/bookmarks/00000000-0000-0000-0000-000000000000`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(404);
    });

    it('returns 401 without a token', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: `/orgs/${orgId}/bookmarks/${bookmarkId}`,
        });
        expect(res.statusCode).toBe(401);
    });
    
});
