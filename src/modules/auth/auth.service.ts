import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto, UserPayload } from './dto/auth-response.dto.js';
import { UserStatus } from '../../generated/prisma/client.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    // 1. Fetch user by email with associated roles
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // 2. Uniform security check: verify user existence and bcrypt password
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Check account status
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        `Account status is ${user.status.toLowerCase()}. Please contact support.`,
      );
    }

    // 4. Extract roles array
    const roles = user.userRoles.map((ur) => ur.role.name);

    // 5. Construct JWT payload and sign token
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    // 6. Build clean, sanitized user response payload (excluding password)
    const userPayload: UserPayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles,
    };

    return {
      accessToken,
      user: userPayload,
    };
  }
}
