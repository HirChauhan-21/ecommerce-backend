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
      categories,
      products,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'SELLER' } }),
      this.prisma.category.findMany({
        include: { products: true },
      }),
      this.prisma.product.findMany(),
    ]);

    const totalOrders = 0;
    const totalSales = 0;
    const totalRevenue = 0;

    // Vendor performance
    const sellers = await this.prisma.user.findMany({
      where: { role: 'SELLER' },
      select: { id: true, name: true, email: true },
    });
    const vendorPerformance = sellers.map((seller) => {
      return {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        sales: 0,
        ordersCount: 0,
      };
    });

    // Customer reports
    const activeCustomers = await this.prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } });
    const blockedCustomers = await this.prisma.user.count({ where: { role: 'USER', status: 'BLOCKED' } });

    // Category reports
    const categoryReports = categories.map((cat) => {
      return {
        id: cat.id,
        name: cat.name,
        productsCount: cat.products.length,
        revenue: 0,
      };
    });

    // Product reports
    const productReports = products.map((prod) => {
      return {
        id: prod.id,
        title: prod.title,
        rating: prod.rating,
        unitsSold: 0,
        revenue: 0,
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10); // Top 10

    // Order status counts
    const orderStatuses = {
      pending: 0,
      paid: 0,
      cancelled: 0,
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

    const totalProductsSold = 0;
    const pendingOrders = [];

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
      pendingVendorRequests,
      pendingProductApprovals,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'SELLER' } }),
      this.prisma.product.count(),
      this.prisma.category.count(),
      this.prisma.user.count({ where: { role: 'SELLER', isApprovedVendor: false } }),
      this.prisma.product.count({ where: { isApproved: false } }),
    ]);

    return {
      totalUsers,
      totalVendors,
      totalProducts,
      totalCategories,
      totalOrders: 0,
      totalRevenue: 0,
      pendingVendorRequests,
      pendingProductApprovals,
    };
  }

  // API 2: Dashboard Chart / Graph data reports (Admin only)
  async getDashboardCharts() {
    const [
      lowStockProducts,
      products,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { stock: { lt: 5 } },
        select: { id: true, title: true, stock: true },
      }),
      this.prisma.product.findMany(),
    ]);

    // 1. Top Selling Products
    const topSellingProducts = products
      .map((p) => {
        return {
          id: p.id,
          title: p.title,
          unitsSold: 0,
          revenue: 0,
        };
      })
      .slice(0, 5);

    // 2. Monthly Sales (Graph data for current calendar year)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySales = months.map((month) => {
      return { month, sales: 0 };
    });

    return {
      lowStockProducts,
      topSellingProducts,
      recentOrders: [],
      monthlySales,
    };
  }
}
