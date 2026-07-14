import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/helpers/pagination.helper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // List all users (Admin only)
  async findAll(page?: number, limit?: number, viewType?: string, role?: string) {
    const where: any = {};
    if (role) {
      // Direct string comparison or matching exact database enum
      where.role = role.toUpperCase();
    }

    return paginate(
      this.prisma.user,
      { page, limit, viewType },
      {
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          isApprovedVendor: true,
          createdAt: true,
        },
      },
      'Users fetched successfully',
    );
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Update user details (Admin only)
  async update(id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isApprovedVendor: true,
      },
    });
  }

  // Delete user (Admin only)
  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'SELLER' && user._count.products > 0) {
      throw new BadRequestException(
        'You cannot delete seller as products of the seller are still there',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }



  // List all vendors/sellers (Admin only)
  async findAllVendors(page?: number, limit?: number, viewType?: string, isApprovedVendor?: string) {
    const where: any = { role: 'SELLER' };
    
    if (isApprovedVendor !== undefined && isApprovedVendor !== '') {
      where.isApprovedVendor = isApprovedVendor === 'true';
    }

    return paginate(
      this.prisma.user,
      { page, limit, viewType },
      {
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          isApprovedVendor: true,
          createdAt: true,
        },
      },
      'Vendors fetched successfully',
    );
  }

  // Set vendor approval status
  async setVendorApproval(id: string, isApproved: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'SELLER' },
    });
    if (!user) {
      throw new NotFoundException('Vendor not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isApprovedVendor: isApproved },
      select: { id: true, name: true, role: true, isApprovedVendor: true },
    });
  }

  // View vendor sales stats
  async getVendorSalesStats() {
    const sellers = await this.prisma.user.findMany({
      where: { role: 'SELLER' },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const salesStats = await Promise.all(
      sellers.map(async (seller) => {
        const orderItems = await this.prisma.orderItem.findMany({
          where: {
            product: { sellerId: seller.id },
            order: { status: 'PAID' },
          },
          include: { order: true },
        });

        const totalSales = orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        return {
          vendorId: seller.id,
          name: seller.name,
          email: seller.email,
          totalSales,
          itemsSold: orderItems.length,
        };
      }),
    );

    return salesStats;
  }
}
