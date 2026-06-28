import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let app: FastifyInstance;
let token: string;

const now = Date.now();
const t0 = new Date(now - 30 * 60 * 1000).toISOString(); // 30 min ago
const t1 = new Date(now - 20 * 60 * 1000).toISOString(); // 20 min ago
const t2 = new Date(now - 10 * 60 * 1000).toISOString(); // 10 min ago

function bm(overrides: object = {}) {
  return {
    id: crypto.randomUUID(),
    url: 'https://example.com',
    title: 'Example',
    description: '',
    tags: [],
    createdAt: t0,
    updatedAt: t1,
    ...overrides,
  };
}

async function sync(payload: object) {
  return app.inject({
    method: 'POST',
    url: '/sync',
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

beforeAll(async () => {
  app = await buildApp();
});

beforeEach(async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { email: 'sync@example.com', password: 'supersecret1234' },
  });
  token = JSON.parse(res.body).token;
});

afterAll(async () => {
  await app.close();
});

describe('POST /sync', () => {
  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'POST', url: '/sync', payload: { bookmarks: [] } });
    expect(res.statusCode).toBe(401);
  });

  it('first sync uploads client bookmarks and returns them', async () => {
    const bookmark = bm({ id: 'aaaaaaaa-0000-0000-0000-000000000001' });
    const res = await sync({ bookmarks: [bookmark], lastSyncAt: null });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.syncedAt).toBeDefined();
    expect(body.bookmarks).toHaveLength(1);
    expect(body.bookmarks[0].id).toBe(bookmark.id);
    expect(body.bookmarks[0].deletedAt).toBeNull();
  });

  it('returns server-only bookmarks to client on first sync', async () => {
    // Create a bookmark directly on the server
    await app.inject({
      method: 'POST',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://server.example.com', title: 'Server Only' },
    });

    // Client syncs with empty local state and no lastSyncAt
    const res = await sync({ bookmarks: [], lastSyncAt: null });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.bookmarks).toHaveLength(1);
    expect(body.bookmarks[0].title).toBe('Server Only');
  });

  it('last-write-wins: client newer version wins', async () => {
    const id = 'bbbbbbbb-0000-0000-0000-000000000001';
    // Initial sync
    await sync({ bookmarks: [bm({ id, title: 'Old Title', updatedAt: t1 })], lastSyncAt: null });

    // Client has a newer version
    const res = await sync({
      bookmarks: [bm({ id, title: 'New Title', updatedAt: t2 })],
      lastSyncAt: t1,
    });
    const body = JSON.parse(res.body);
    expect(body.bookmarks[0].title).toBe('New Title');
  });

  it('last-write-wins: server newer version wins', async () => {
    const id = 'cccccccc-0000-0000-0000-000000000001';
    // Server has the bookmark at t2
    await app.inject({
      method: 'POST',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
      payload: { id, url: 'https://example.com', title: 'Server Version' },
    });

    // Client sends an older version at t1 — server should win
    const res = await sync({
      bookmarks: [bm({ id, title: 'Client Version', updatedAt: t1 })],
      lastSyncAt: null,
    });
    const body = JSON.parse(res.body);
    expect(body.bookmarks[0].title).toBe('Server Version');
  });

  it('client deletion propagates to server when bookmark was known at lastSyncAt', async () => {
    const id = 'dddddddd-0000-0000-0000-000000000001';
    // Initial sync — server learns about the bookmark
    await sync({ bookmarks: [bm({ id, updatedAt: t1 })], lastSyncAt: null });

    // Client syncs again without the bookmark → inferred deletion
    const res = await sync({ bookmarks: [], lastSyncAt: t1 });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Tombstone should be in response (deletedAt set)
    const tombstone = body.bookmarks.find((b: { id: string }) => b.id === id);
    expect(tombstone).toBeDefined();
    expect(tombstone.deletedAt).not.toBeNull();
  });

  it('server bookmark added after lastSyncAt is not deleted when missing from client', async () => {
    const id = 'eeeeeeee-0000-0000-0000-000000000001';
    // Client syncs empty state at t1
    await sync({ bookmarks: [], lastSyncAt: t1 });

    // Server gets a bookmark via the bookmarks API (simulating another device)
    await app.inject({
      method: 'POST',
      url: '/bookmarks',
      headers: { authorization: `Bearer ${token}` },
      payload: { id, url: 'https://other.example.com', title: 'Other Device' },
    });

    // Client syncs again without that bookmark, but lastSyncAt is before it was created
    const res = await sync({ bookmarks: [], lastSyncAt: t1 });
    const body = JSON.parse(res.body);
    const serverBm = body.bookmarks.find((b: { id: string }) => b.id === id);
    expect(serverBm).toBeDefined();
    expect(serverBm.deletedAt).toBeNull();
  });

  it('explicit deletedAt on client bookmark propagates to server', async () => {
    const id = 'ffffffff-0000-0000-0000-000000000001';
    await sync({ bookmarks: [bm({ id, updatedAt: t1 })], lastSyncAt: null });

    const res = await sync({
      bookmarks: [bm({ id, updatedAt: t2, deletedAt: t2 })],
      lastSyncAt: t1,
    });
    const body = JSON.parse(res.body);
    const tombstone = body.bookmarks.find((b: { id: string }) => b.id === id);
    expect(tombstone.deletedAt).toBe(t2);
  });
});

describe('POST /sync - org bookmarks', () => {
    let orgId: string;

    beforeEach(async () => {
        const org = await prisma.organization.create({ data: { name: 'Test Org' } });
        orgId = org.id;
        await prisma.bookmark.create({
            data: { url: 'https://org.example.com', title: 'Org BM', orgId },
        });
    });

    it('includes org bookmarks with readOnly: true for a member', async () => {
        const user = await prisma.user.findUnique({ where: { email: 'sync@example.com' } });
        await prisma.orgMembership.create({ data: { orgId, userId: user!.id, role: 'MEMBER' } });

        const res = await sync({ bookmarks: [], lastSyncAt: null });
        const body = JSON.parse(res.body);
        const orgBm = body.bookmarks.find((b: { url: string }) => b.url === 'https://org.example.com');
        expect(orgBm).toBeDefined();
        expect(orgBm.readOnly).toBe(true);
    });

    it('does not include org bookmarks for a non-member', async () => {
        // sync@example.com has no membership — org bookmark should be absent
        const res = await sync({ bookmarks: [], lastSyncAt: null });
        const body = JSON.parse(res.body);
        const orgBm = body.bookmarks.find((b: { url: string }) => b.url === 'https://org.example.com');
        expect(orgBm).toBeUndefined();
    });
});

