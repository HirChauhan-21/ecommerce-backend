import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const normalizedEmail = registerDto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = crypto.createHash('sha256').update(registerDto.password).digest('hex');

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: registerDto.role,
      },
    });

    const { password, ...result } = user;

    return result;
  }

  async login(loginDto: LoginDto) {
    const normalizedEmail = loginDto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    let isPasswordValid = false;
    if (user.password.startsWith('$2b$')) {
      const bcrypt = require('bcrypt');
      isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    } else {
      isPasswordValid = crypto.createHash('sha256').update(loginDto.password).digest('hex') === user.password;
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Authorization checks
    if (user.status === 'BLOCKED') {
      throw new ForbiddenException('Your account has been blocked by the admin.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const normalizedEmail = forgotPasswordDto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    return {
      message: 'OTP sent successfully. Use static OTP 123456 to reset password.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const normalizedEmail = resetPasswordDto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    if (resetPasswordDto.otp !== '123456') {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const hashedPassword = crypto.createHash('sha256').update(resetPasswordDto.newPassword).digest('hex');

    await this.prisma.user.update({
      where: { email: resetPasswordDto.email },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password reset successfully',
    };
  }
}
