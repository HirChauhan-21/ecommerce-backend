import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles/roles.decorator';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        discountPrice: { type: 'number' },
        image: { type: 'string', format: 'binary' },
        rating: { type: 'number' },
        categoryId: { type: 'string' },
      },
      required: ['title', 'description', 'price', 'categoryId', 'image'],
    },
  })
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: any,
    @UploadedFile() file: any,
  ) {
    const sellerId = req.user.sub;
    const imageUrl = file ? `/uploads/${file.filename}` : undefined;
    // Use file upload path if available; otherwise, check if image was sent as a base64 string in the body
    const finalImage = imageUrl || createProductDto.image;

    // Parse numeric fields because multipart/form-data sends them as strings
    const parsedDto = {
      ...createProductDto,
      price: typeof createProductDto.price === 'string' ? parseFloat(createProductDto.price) : createProductDto.price,
      discountPrice: createProductDto.discountPrice ? (typeof createProductDto.discountPrice === 'string' ? parseFloat(createProductDto.discountPrice) : createProductDto.discountPrice) : undefined,
      rating: createProductDto.rating ? (typeof createProductDto.rating === 'string' ? parseFloat(createProductDto.rating) : createProductDto.rating) : undefined,
      image: finalImage,
    };
    
    return this.productService.create(parsedDto, sellerId);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('viewType') viewType?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.productService.findAll(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      viewType,
      search,
      sortBy,
      categoryId,
      sellerId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: any,
  ) {
    const currentUser = {
      id: req.user.sub,
      role: req.user.role,
    };
    return this.productService.update(id, updateProductDto, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const currentUser = {
      id: req.user.sub,
      role: req.user.role,
    };
    return this.productService.remove(id, currentUser);
  }
}
