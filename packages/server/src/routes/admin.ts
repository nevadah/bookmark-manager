import { FastifyInstance } from "fastify";

export async function adminRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request, reply) => {
        await app.authenticate(request, reply);
        if (reply.sent) return;
        if (!request.user?.isSystemAdmin) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
    });

    app.get('/admin/orgs', async () => {
        return app.prisma.organization.findMany({ orderBy: { name: 'asc' } });
    });

    app.post('/admin/orgs', {
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', minLength: 1 } },
            },
        }
    }, async (request, reply) => {
        const { name } = request.body as { name: string };
        const org = await app.prisma.organization.create({ data: { name } });
        return reply.code(201).send(org);
    });

    app.delete('/admin/orgs/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const existing = await app.prisma.organization.findUnique({ where: { id } });
        if (!existing) {
            return reply.code(404).send({ error: 'Organization not found' });
        }
        await app.prisma.organization.delete({ where: { id } });
        return reply.code(204).send();
    });

    app.get('/admin/users', async () => {
        return app.prisma.user.findMany({
            select: { id: true, email: true, isSystemAdmin: true, createdAt: true },
            orderBy: { email: 'asc' },
        });
    });
}