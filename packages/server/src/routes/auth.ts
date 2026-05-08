import { FastifyInstance } from 'fastify';
import { randomBytes, createHash } from 'crypto';
import { hash, verify } from '@node-rs/argon2';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

const credentialsSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 12 },
  },
};

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/signup', {
    schema: { body: credentialsSchema },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const existing = await app.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: 'Email already in use' });
    }

    const passwordHash = await hash(password);
    const user = await app.prisma.user.create({ data: { email, passwordHash } });

    const { token, tokenHash } = generateSessionToken();
    await app.prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      },
    });

    return reply.code(201).send({ token });
  });

  app.post('/auth/login', {
    schema: { body: credentialsSchema },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user || !(await verify(user.passwordHash, password))) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const { token, tokenHash } = generateSessionToken();
    await app.prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      },
    });

    return reply.code(200).send({ token });
  });

  app.post('/auth/logout', {
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const header = request.headers.authorization!;
    const token = header.slice(7);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await app.prisma.session.delete({ where: { tokenHash } });
    return reply.code(204).send();
  });
}
