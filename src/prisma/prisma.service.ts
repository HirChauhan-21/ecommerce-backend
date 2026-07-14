import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Connected to PostgreSQL');
      await this.seedAdmin();
    } catch (error) {
      console.error('Prisma connection failed:', error);
      throw error;
    }
  }

  private async seedAdmin() {
    const adminEmail = 'hir@gmail.com';
    const adminPassword = '123456';

    const existingAdmin = await this.user.findFirst({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      await this.user.create({
        data: {
          name: 'Admin',
          email: adminEmail,
          password: adminPassword,
          role: 'ADMIN',
        },
      });
      console.log('Seeded admin user:', adminEmail);
    } else {
      console.log('Admin user already exists');
    }
  }
}
