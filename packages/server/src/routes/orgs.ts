import { FastifyInstance } from "fastify";
import { OrgRole } from "@prisma/client";

async function getOrgAdminMembership(app: FastifyInstance, userId: string, orgId: string) {
    const membership = await app.prisma.orgMembership.findUnique({
        where: { userId_orgId: { userId, orgId } }
    });
    return membership?.role === OrgRole.ADMIN ? membership : null;
}

export async function orgRoutes(app: FastifyInstance) {

    app.get('/orgs/:id',
        {
            preHandler: app.authenticate
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const membership = await app.prisma.orgMembership.findUnique({
                where: { userId_orgId: { userId: request.user.id, orgId: id } },
            });
            if (!membership) return reply.code(403).send({ error: 'Forbidden' });
            const org = await app.prisma.organization.findUnique({ where: { id } });
            if (!org) return reply.code(404).send({ error: 'Not found' });
            return org;
        }
    );

    app.get('/orgs/:id/members', 
        { preHandler: app.authenticate },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const membership = await getOrgAdminMembership(app, request.user.id, id);
            if (!membership) {
                return reply.code(403).send({ error: 'Forbidden' });
            }
            return app.prisma.orgMembership.findMany({
                where: { orgId: id },
                include: { user: { select: { id: true, email: true } } },
            });
        }
    );

    app.post('/orgs/:id/members', 
        {
            preHandler: app.authenticate,
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['MEMBER', 'EDITOR', 'ADMIN'] },
                    },
                    required: ['email', 'role'],
                },
            }
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const membership = await getOrgAdminMembership(app, request.user.id, id);
            if (!membership) {
                return reply.code(403).send({ error: 'Forbidden' });
            }
            const { email, role } = request.body as { email: string; role: OrgRole };
            const user = await app.prisma.user.findUnique({ where: { email } });
            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
            const existing = await app.prisma.orgMembership.findUnique({
                where: { userId_orgId: { userId: user.id, orgId: id } },
            });
            if (existing) return reply.code(409).send({ error: 'User is already a member' });
            const newMembership = await app.prisma.orgMembership.create({
                data: {
                    orgId: id,
                    userId: user.id,
                    role,
                },
            });
            return reply.code(201).send(newMembership);
        }
    );

    app.delete('/orgs/:id/members/:userId', 
        { preHandler: app.authenticate },
        async (request, reply) => {
            const { id, userId } = request.params as { id: string; userId: string };
            const membership = await getOrgAdminMembership(app, request.user.id, id);
            if (!membership) {
                return reply.code(403).send({ error: 'Forbidden' });
            }
            const existing = await app.prisma.orgMembership.findUnique({
                where: { userId_orgId: { userId, orgId: id } }
            });
            if (!existing) {
                return reply.code(404).send({ error: 'Membership not found' });
            }
            await app.prisma.orgMembership.delete({
                where: { userId_orgId: { userId, orgId: id } }
            });
            return reply.code(204).send();
        }
    );

    app.patch('/orgs/:id/members/:userId', 
        {
            preHandler: app.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['role'],
                    properties: { role: { type: 'string', enum: ['MEMBER', 'EDITOR', 'ADMIN'] } },
                },
            },
        },
        async (request, reply) => {
            const { id, userId } = request.params as { id: string; userId: string };
            const membership = await getOrgAdminMembership(app, request.user.id, id);
            if (!membership) {
                return reply.code(403).send({ error: 'Forbidden' });
            }
            const { role } = request.body as { role: OrgRole };
            const existing = await app.prisma.orgMembership.findUnique({
                where: { userId_orgId: { userId, orgId: id } }
            });
            if (!existing) {
                return reply.code(404).send({ error: 'Membership not found' });
            }
            const updatedMembership = await app.prisma.orgMembership.update({
                where: { userId_orgId: { userId, orgId: id } },
                data: { role }
            });
            return reply.code(200).send(updatedMembership);
        }
    );

}