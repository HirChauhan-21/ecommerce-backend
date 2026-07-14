import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles/roles.guard';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('profile')
  async profile(@Req() req: any) {
    return this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isApprovedVendor: true,
        createdAt: true,
      },
    });
  }
}
