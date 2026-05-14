import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import { prismaPlugin } from './plugins/prisma.js';
import { sessionPlugin } from './plugins/session.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { bookmarkRoutes } from './routes/bookmarks.js';
import { aiRoutes } from './routes/ai.js';
import cors from '@fastify/cors';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Bookmark Manager API',
        version: '0.1.0',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(cors, {
      origin: (origin, cb) => {
          if (!origin || origin.startsWith('chrome-extension://') || origin.startsWith('http://localhost')) {
              cb(null, true);
          } else {
              cb(new Error('Not allowed'), false);
          }
      },
  });

  if (process.env.NODE_ENV !== 'test') {
    await app.register(rateLimit, {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (request) => request.ip,
        allowList: (request) => {
            // Allow unlimited requests from localhost for testing purposes
            return request.ip === '127.0.0.1' || request.ip === '::1';
        }
    });
  }

  await app.register(prismaPlugin);
  await app.register(sessionPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(bookmarkRoutes);
  await app.register(aiRoutes);

  return app;
}
