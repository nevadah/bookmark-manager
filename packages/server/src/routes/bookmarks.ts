import { FastifyInstance } from 'fastify';

const bookmarkBody = {
  type: 'object',
  required: ['url', 'title'],
  properties: {
    url:         { type: 'string', format: 'uri' },
    title:       { type: 'string', minLength: 1 },
    description: { type: 'string' },
    tags:        { type: 'array', items: { type: 'string' } },
    faviconUrl:  { type: 'string', format: 'uri' },
  },
};

const bookmarkPatchBody = {
  type: 'object',
  properties: {
    url:         { type: 'string', format: 'uri' },
    title:       { type: 'string', minLength: 1 },
    description: { type: 'string' },
    tags:        { type: 'array', items: { type: 'string' } },
    faviconUrl:  { type: 'string', format: 'uri' },
  },
};

export async function bookmarkRoutes(app: FastifyInstance) {
  app.get('/bookmarks', {
    preHandler: app.authenticate,
  }, async (request) => {
    return app.prisma.bookmark.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' },
    });
  });

  app.post('/bookmarks', {
    preHandler: app.authenticate,
    schema: { body: bookmarkBody },
  }, async (request, reply) => {
    const { url, title, description = '', tags = [], faviconUrl } =
      request.body as {
        url: string; title: string; description?: string;
        tags?: string[]; faviconUrl?: string;
      };

    const bookmark = await app.prisma.bookmark.create({
      data: { url, title, description, tags, faviconUrl, userId: request.user.id },
    });

    return reply.code(201).send(bookmark);
  });

  app.patch('/bookmarks/:id', {
    preHandler: app.authenticate,
    schema: { body: bookmarkPatchBody },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await app.prisma.bookmark.findUnique({ where: { id } });

    if (!existing || existing.userId !== request.user.id) {
      return reply.code(404).send({ error: 'Not found' });
    }

    const data = request.body as Partial<{
      url: string; title: string; description: string;
      tags: string[]; faviconUrl: string;
    }>;

    const updated = await app.prisma.bookmark.update({ where: { id }, data });
    return updated;
  });

  app.delete('/bookmarks/:id', {
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await app.prisma.bookmark.findUnique({ where: { id } });

    if (!existing || existing.userId !== request.user.id) {
      return reply.code(404).send({ error: 'Not found' });
    }

    await app.prisma.bookmark.delete({ where: { id } });
    return reply.code(204).send();
  });
}
