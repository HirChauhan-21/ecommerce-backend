import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { paginate } from '../common/helpers/pagination.helper';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto, sellerId: string) {
  
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
    });

    if (seller && seller.role === 'SELLER' && !seller.isApprovedVendor) {
      throw new ForbiddenException(
        'Your vendor account has not been approved by the admin yet. You cannot add products.',
      );
    }

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        image: createProductDto.image || '',
        sellerId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(
    page?: number,
    limit?: number,
    viewType?: string,
    search?: string,
    sortBy?: string,
    categoryId?: string,
    sellerId?: string,
  ) {
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    let orderBy: any = undefined;
    if (sortBy === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sortBy === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (sortBy === 'category') {
      orderBy = { category: { name: 'asc' } };
    }

    return paginate(
      this.prisma.product,
      { page, limit, viewType },
      {
        where,
        orderBy,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          discountPrice: true,
          image: true,
          rating: true,
          categoryId: true,
          sellerId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      'Products fetched successfully',
    );
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        discountPrice: true,
        image: true,
        rating: true,
        categoryId: true,
        sellerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    currentUser: { id: string; role: string },
  ) {
    const product = await this.findOne(id);

    if (currentUser.role !== 'ADMIN' && product.sellerId !== currentUser.id) {
      throw new ForbiddenException(
        'You do not have permission to update this product',
      );
    }

    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: {
          select: { id: true, name: true },
        },
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async remove(id: string, currentUser: { id: string; role: string }) {
    const product = await this.findOne(id);

    if (currentUser.role !== 'ADMIN' && product.sellerId !== currentUser.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this product',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }
}
