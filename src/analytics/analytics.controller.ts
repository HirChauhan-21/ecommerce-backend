import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles('ADMIN')
  @Get('platform')
  getPlatformAnalytics() {
    return this.analyticsService.getPlatformAnalytics();
  }

  @Roles('SELLER')
  @Get('seller/dashboard')
  getSellerDashboard(@Req() req: any) {
    const vendorId = req.user.sub;
    return this.analyticsService.getSellerDashboard(vendorId);
  }

  @Roles('ADMIN')
  @Get('dashboard/summary')
  getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }

  @Roles('ADMIN')
  @Get('dashboard/charts')
  getDashboardCharts() {
    return this.analyticsService.getDashboardCharts();
  }
}
