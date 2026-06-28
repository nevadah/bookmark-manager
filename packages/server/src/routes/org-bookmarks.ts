import { FastifyInstance } from "fastify";
import { OrgRole } from "@prisma/client";

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

async function getOrgAdminMembership(app: FastifyInstance, userId: string, orgId: string) {
    const membership = await app.prisma.orgMembership.findUnique({
        where: { userId_orgId: { userId, orgId } }
    });
    return membership?.role === OrgRole.ADMIN ? membership : null;
}

export async function orgBookmarkRoutes(app: FastifyInstance) {

    app.post('/orgs/:id/bookmarks', {
        preHandler: app.authenticate,
        schema: {
            body: bookmarkBody
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const membership = await getOrgAdminMembership(app, request.user.id, id);
        if (!membership) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        const { url, title, description = '', tags = [], faviconUrl } = request.body as {
            url: string; title: string; description?: string;
            tags?: string[]; faviconUrl?: string;
        };
        const bookmark = await app.prisma.bookmark.create({
            data: { url, title, description, tags, faviconUrl, orgId: id },
        });
        return reply.code(201).send(bookmark);
    });

    app.patch('/orgs/:id/bookmarks/:bookmarkId', {
        preHandler: app.authenticate,
        schema: {
            body: bookmarkPatchBody
        }
    }, async (request, reply) => {
        const { id, bookmarkId } = request.params as { id: string; bookmarkId: string };
        const membership = await getOrgAdminMembership(app, request.user.id, id);
        if (!membership) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        const existingBookmark = await app.prisma.bookmark.findUnique({
            where: { id: bookmarkId, orgId: id }
        });
        if (!existingBookmark) {
            return reply.code(404).send({ error: 'Bookmark not found' });
        }
        const data = request.body as Partial<{
            url: string; title: string; description: string;
            tags: string[]; faviconUrl: string;
        }>;
        const updatedBookmark = await app.prisma.bookmark.update({
            where: { id: bookmarkId, orgId: id },
            data,
        });
        return reply.code(200).send(updatedBookmark);
    });

    app.delete('/orgs/:id/bookmarks/:bookmarkId', {
        preHandler: app.authenticate,
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    bookmarkId: { type: 'string' }
                },
                required: ['id', 'bookmarkId']
            }
        }
    }, async (request, reply) => {
        const { id, bookmarkId } = request.params as { id: string; bookmarkId: string };
        const membership = await getOrgAdminMembership(app, request.user.id, id);
        if (!membership) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        const existingBookmark = await app.prisma.bookmark.findUnique({
            where: { id: bookmarkId, orgId: id }
        });
        if (!existingBookmark) {
            return reply.code(404).send({ error: 'Bookmark not found' });
        }
        await app.prisma.bookmark.delete({
            where: { id: bookmarkId, orgId: id }
        });
        return reply.code(204).send();
    });
}