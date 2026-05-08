import { PrismaClient } from '@prisma/client';
import { beforeEach } from 'vitest';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.session.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.orgMembership.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
});
