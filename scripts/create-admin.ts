import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for existing admins...');

  const existingAdmins = await prisma.users.findMany({
    where: {
      role: 'admin'
    }
  });

  if (existingAdmins.length > 0) {
    console.error('❌ Failed to create admin because some or 1 admin is already exist.');
    console.error(`   Found ${existingAdmins.length} existing admin(s):`);
    existingAdmins.forEach((admin, index) => {
      console.error(`   ${index + 1}. ${admin.email || admin.username || `ID: ${admin.id}`}`);
    });
    process.exit(1);
  }

  console.log('✅ No existing admins found. Creating admin...');

  const hashedPassword = await bcrypt.hash('suitableit', 10);

  const admin = await prisma.users.create({
    data: {
      username: 'likefollowsmmpanel_admin',
      name: 'Like Follow SMM Panel Admin',
      email: 'admin@likefollowsmmpanel.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      emailVerified: new Date(),
      language: 'en',
      timezone: 'Asia/Dhaka',
    }
  });

  console.log('✅ Admin created successfully!');
  console.log(`   ID: ${admin.id}`);
  console.log(`   Username: ${admin.username}`);
  console.log(`   Password: suitableit`);
  console.log(`   Name: ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role: ${admin.role}`);

}

main()
  .catch((e) => {
    console.error('❌ Error during admin creation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
