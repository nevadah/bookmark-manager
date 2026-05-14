import { FastifyInstance } from 'fastify';
import { suggestTags } from '../services/ai.js';

const suggestTagsBody = {
  type: 'object',
  required: ['url', 'title'],
  properties: {
    url:          { type: 'string' },
    title:        { type: 'string' },
    description:  { type: 'string' },
    existingTags: { type: 'array', items: { type: 'string' } },
  },
};

export async function aiRoutes(app: FastifyInstance) {
  app.post('/ai/suggest-tags', {
    preHandler: app.authenticate,
    schema: { body: suggestTagsBody },
  }, async (request) => {
    const { url, title, description = '', existingTags = [] } = request.body as {
      url: string;
      title: string;
      description?: string;
      existingTags?: string[];
    };
    const tags = await suggestTags(url, title, description, existingTags);
    return { tags };
  });
}
