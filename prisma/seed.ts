import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin123@yopmail.com';

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`✅ Admin user already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await bcrypt.hash('Admin@1234', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`🎉 Default admin created successfully!`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.role}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
