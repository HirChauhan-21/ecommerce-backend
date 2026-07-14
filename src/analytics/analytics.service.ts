import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Platform wide analytics (Admin only)
  async getPlatformAnalytics() {
    const [
      totalUsers,
      totalVendors,
      totalOrders,
      orders,
      categories,
      products,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'SELLER' } }),
      this.prisma.order.count(),
      this.prisma.order.findMany({
        include: { items: { include: { product: true } } },
      }),
      this.prisma.category.findMany({
        include: { products: { include: { orderItems: { include: { order: true } } } } },
      }),
      this.prisma.product.findMany({
        include: { orderItems: { include: { order: true } } },
      }),
    ]);

    // Sales and revenue from PAID orders
    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const totalSales = paidOrders.length;
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Vendor performance
    const sellers = await this.prisma.user.findMany({
      where: { role: 'SELLER' },
      select: { id: true, name: true, email: true },
    });
    const vendorPerformance = await Promise.all(
      sellers.map(async (seller) => {
        const vendorOrderItems = await this.prisma.orderItem.findMany({
          where: {
            product: { sellerId: seller.id },
            order: { status: 'PAID' },
          },
        });
        const sales = vendorOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          sales,
          ordersCount: new Set(vendorOrderItems.map((item) => item.orderId)).size,
        };
      }),
    );

    // Customer reports
    const activeCustomers = await this.prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } });
    const blockedCustomers = await this.prisma.user.count({ where: { role: 'USER', status: 'BLOCKED' } });

    // Category reports
    const categoryReports = categories.map((cat) => {
      let catRevenue = 0;
      cat.products.forEach((prod) => {
        prod.orderItems.forEach((item) => {
          if (item.order.status === 'PAID') {
            catRevenue += item.price * item.quantity;
          }
        });
      });
      return {
        id: cat.id,
        name: cat.name,
        productsCount: cat.products.length,
        revenue: catRevenue,
      };
    });

    // Product reports
    const productReports = products.map((prod) => {
      const paidItems = prod.orderItems.filter((item) => item.order.status === 'PAID');
      const unitsSold = paidItems.reduce((sum, item) => sum + item.quantity, 0);
      const revenue = paidItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return {
        id: prod.id,
        title: prod.title,
        rating: prod.rating,
        unitsSold,
        revenue,
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10); // Top 10

    // Order status counts
    const orderStatuses = {
      pending: orders.filter((o) => o.status === 'PENDING').length,
      paid: paidOrders.length,
      cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    };

    return {
      overview: {
        totalUsers,
        totalVendors,
        totalOrders,
        totalSales,
        totalRevenue,
      },
      orderReports: orderStatuses,
      customerReports: {
        active: activeCustomers,
        blocked: blockedCustomers,
      },
      categoryReports,
      productReports,
      vendorPerformance,
    };
  }

  // Seller Dashboard statistics (Seller/Vendor)
  async getSellerDashboard(vendorId: string) {
    const totalProducts = await this.prisma.product.count({
      where: { sellerId: vendorId },
    });

    const shippedAndDeliveredItems = await this.prisma.orderItem.findMany({
      where: {
        product: { sellerId: vendorId },
        order: {
          status: { in: ['SHIPPED', 'DELIVERED'] },
        },
      },
      select: {
        quantity: true,
      },
    });
    const totalProductsSold = shippedAndDeliveredItems.reduce((sum, item) => sum + item.quantity, 0);

    const pendingOrders = await this.prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'ACCEPTED'] },
        items: {
          some: {
            product: { sellerId: vendorId },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          where: {
            product: { sellerId: vendorId },
          },
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      totalProducts,
      totalProductsSold,
      pendingProductOrderCount: pendingOrders.length,
      pendingOrders,
    };
  }

  // API 1: Dashboard Summary stats (Admin only)
  async getDashboardSummary() {
    const [
      totalUsers,
      totalVendors,
      totalProducts,
      totalCategories,
      totalOrders,
      paidOrders,
      pendingVendorRequests,
      pendingProductApprovals,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'SELLER' } }),
      this.prisma.product.count(),
      this.prisma.category.count(),
      this.prisma.order.count(),
      this.prisma.order.findMany({ where: { status: 'PAID' } }),
      this.prisma.user.count({ where: { role: 'SELLER', isApprovedVendor: false } }),
      this.prisma.product.count({ where: { isApproved: false } }),
    ]);

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      totalUsers,
      totalVendors,
      totalProducts,
      totalCategories,
      totalOrders,
      totalRevenue,
      pendingVendorRequests,
      pendingProductApprovals,
    };
  }

  // API 2: Dashboard Chart / Graph data reports (Admin only)
  async getDashboardCharts() {
    const [
      lowStockProducts,
      orders,
      products,
      recentOrders,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { stock: { lt: 5 } },
        select: { id: true, title: true, stock: true },
      }),
      this.prisma.order.findMany({
        include: { items: { include: { product: true } } },
      }),
      this.prisma.product.findMany({
        include: { orderItems: { include: { order: true } } },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: true } },
        },
      }),
    ]);

    // 1. Top Selling Products
    const topSellingProducts = products
      .map((p) => {
        const paidItems = p.orderItems.filter((item) => item.order.status === 'PAID');
        const unitsSold = paidItems.reduce((sum, item) => sum + item.quantity, 0);
        const revenue = paidItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return {
          id: p.id,
          title: p.title,
          unitsSold,
          revenue,
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    // 2. Monthly Sales (Graph data for current calendar year)
    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySales = months.map((month, index) => {
      const monthOrders = paidOrders.filter((o) => new Date(o.createdAt).getMonth() === index);
      const sales = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      return { month, sales };
    });

    return {
      lowStockProducts,
      topSellingProducts,
      recentOrders,
      monthlySales,
    };
  }
}
