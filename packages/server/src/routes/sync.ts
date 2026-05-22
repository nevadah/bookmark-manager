import { FastifyInstance } from 'fastify';

interface ClientBookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  tags?: string[];
  faviconUrl?: string;
  createdAt?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface SyncBody {
  bookmarks: ClientBookmark[];
  lastSyncAt?: string | null;
}

const clientBookmarkSchema = {
  type: 'object',
  required: ['id', 'url', 'title', 'updatedAt'],
  properties: {
    id:          { type: 'string' },
    url:         { type: 'string' },
    title:       { type: 'string' },
    description: { type: 'string' },
    tags:        { type: 'array', items: { type: 'string' } },
    faviconUrl:  { type: 'string', nullable: true },
    createdAt:   { type: 'string' },
    updatedAt:   { type: 'string' },
    deletedAt:   { type: 'string', nullable: true },
  },
};

export async function syncRoutes(app: FastifyInstance) {
  app.post('/sync', {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['bookmarks'],
        properties: {
          bookmarks:  { type: 'array', items: clientBookmarkSchema },
          lastSyncAt: { type: 'string', nullable: true },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.id;
    const { bookmarks: clientBookmarks, lastSyncAt } = request.body as SyncBody;

    const syncedAt = new Date();
    const lastSync = lastSyncAt ? new Date(lastSyncAt) : null;
    const thirtyDaysAgo = new Date(syncedAt.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Hard-delete tombstones older than 30 days
    await app.prisma.bookmark.deleteMany({
      where: { userId, deletedAt: { not: null, lt: thirtyDaysAgo } },
    });

    // Load current server state
    const serverBookmarks = await app.prisma.bookmark.findMany({ where: { userId } });
    const serverMap = new Map(serverBookmarks.map(b => [b.id, b]));
    const clientMap = new Map(clientBookmarks.map(b => [b.id, b]));

    // Upsert each client bookmark using last-write-wins on updatedAt
    for (const cb of clientBookmarks) {
      const clientUpdatedAt = new Date(cb.updatedAt);
      const clientDeletedAt = cb.deletedAt ? new Date(cb.deletedAt) : null;
      const server = serverMap.get(cb.id);

      if (!server) {
        await app.prisma.bookmark.create({
          data: {
            id: cb.id,
            url: cb.url,
            title: cb.title,
            description: cb.description ?? '',
            tags: cb.tags ?? [],
            faviconUrl: cb.faviconUrl ?? null,
            createdAt: cb.createdAt ? new Date(cb.createdAt) : syncedAt,
            updatedAt: clientUpdatedAt,
            deletedAt: clientDeletedAt,
            userId,
          },
        });
      } else if (clientUpdatedAt > server.updatedAt) {
        await app.prisma.bookmark.update({
          where: { id: cb.id },
          data: {
            url: cb.url,
            title: cb.title,
            description: cb.description ?? server.description,
            tags: cb.tags ?? server.tags,
            faviconUrl: cb.faviconUrl !== undefined ? cb.faviconUrl : server.faviconUrl,
            updatedAt: clientUpdatedAt,
            deletedAt: clientDeletedAt,
          },
        });
      }
    }

    // Infer client-side deletions: server bookmarks absent from client that
    // were last updated before lastSyncAt (client knew about them and removed them)
    if (lastSync) {
      for (const sb of serverBookmarks) {
        if (!clientMap.has(sb.id) && sb.deletedAt === null && sb.updatedAt <= lastSync) {
          await app.prisma.bookmark.update({
            where: { id: sb.id },
            data: { deletedAt: syncedAt },
          });
        }
      }
    }

    // Return merged state: live bookmarks + recent tombstones (for deletion propagation)
    const result = await app.prisma.bookmark.findMany({
      where: {
        userId,
        OR: [
          { deletedAt: null },
          { deletedAt: { gte: thirtyDaysAgo } },
        ],
      },
    });

    return reply.send({ bookmarks: result, syncedAt: syncedAt.toISOString() });
  });
}
