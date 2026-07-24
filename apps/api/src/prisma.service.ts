import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      console.warn('Prisma DB connection failed — API will use embedded defaults.', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
