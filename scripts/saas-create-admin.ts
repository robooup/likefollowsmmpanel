// Creates (or promotes) the TopupCraft super admin.
//   npm run saas:create-admin -- you@example.com "Your Name"
// The password is read from the SAAS_ADMIN_PASSWORD environment variable or
// typed at the prompt, so it never ends up in shell history.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'node:readline';

function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    if (hidden) {
      (rl as any)._writeToOutput = (text: string) => {
        if (text.includes(question)) (rl as any).output.write(text);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const url = process.env.PLATFORM_DATABASE_URL;
  if (!url) throw new Error('PLATFORM_DATABASE_URL is not set');
  const email = (process.argv[2] || '').trim().toLowerCase();
  const name = (process.argv[3] || 'Administrator').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Usage: npm run saas:create-admin -- you@example.com "Your Name"');
  const password = process.env.SAAS_ADMIN_PASSWORD || (await ask('Admin password (min 10 characters): ', true));
  if (password.length < 10) throw new Error('Password must be at least 10 characters');

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.saasUser.upsert({
      where: { email },
      create: { email, name, passwordHash, role: 'admin' },
      update: { passwordHash, role: 'admin', status: 'active', sessionVersion: { increment: 1 } },
    });
    console.log(`Super admin ready: ${user.email} (id ${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
