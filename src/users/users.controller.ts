import {
  Controller,
  Get,
  Req,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  profile(@Req() req: any) {
    return this.usersService.findOne(req.user.sub);
  }



  // --- USER MANAGEMENT (Admin Only) ---

  @Roles('ADMIN')
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('viewType') viewType?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      viewType,
      role,
    );
  }

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() data: any) {
    return this.usersService.update(req.user.sub, data);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.usersService.update(id, data);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }


  @Roles('ADMIN')
  @Get('vendors/list')
  findAllVendors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('viewType') viewType?: string,
    @Query('isApprovedVendor') isApprovedVendor?: string,
  ) {
    return this.usersService.findAllVendors(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      viewType,
      isApprovedVendor,
    );
  }

  @Roles('ADMIN')
  @Patch('vendors/:id/approval')
  setVendorApproval(
    @Param('id') id: string,
    @Body('isApprovedVendor') isApprovedVendor: boolean,
  ) {
    return this.usersService.setVendorApproval(id, isApprovedVendor);
  }

 @Roles('ADMIN', 'SELLER')
  @Get('vendors/sales')
  getVendorSalesStats() {
    return this.usersService.getVendorSalesStats();
  }
}