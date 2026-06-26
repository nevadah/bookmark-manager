import { createInterface } from 'readline';
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const email = (await prompt(rl, 'Admin email: ')).trim();
    if (!email) {
      console.error('Email is required.');
      process.exit(1);
    }

    const password = (await prompt(rl, 'Password (min 8 characters): ')).trim();
    if (password.length < 8) {
      console.error('Password must be at least 8 characters.');
      process.exit(1);
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.isSystemAdmin) {
        console.log(`${email} is already a system admin.`);
        process.exit(0);
      }
      await prisma.user.update({ where: { email }, data: { isSystemAdmin: true } });
      console.log(`${email} has been granted system admin access.`);
    } else {
      const passwordHash = await hash(password);
      await prisma.user.create({ data: { email, passwordHash, isSystemAdmin: true } });
      console.log(`System admin account created for ${email}.`);
    }
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
