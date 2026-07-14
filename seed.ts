import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'hir@gmail.com';
  const adminPassword = '123456';

  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log('Admin user created');
  } else {
    console.log('Admin user already exists');
  }

  const categories = [
    { name: 'Electronics', description: 'Electronic gadgets and devices' },
    { name: 'Fashion', description: 'Clothing and accessories' },
    { name: 'Home', description: 'Home essentials and decor' },
  ];

  for (const category of categories) {
    const existing = await prisma.category.findUnique({
      where: { name: category.name },
    });

    if (!existing) {
      await prisma.category.create({ data: category });
    }
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
