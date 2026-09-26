import {
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    await this.ensureAdminSeed();
  }

  private async ensureAdminSeed() {
    const count = await this.prisma.user.count();
    if (count > 0) return;
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await this.prisma.user.create({
      data: {
        email: 'admin@local.dev',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    // eslint-disable-next-line no-console
    console.log('[auth] Seeded default admin admin@local.dev / Admin123!');
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role ?? UserRole.OPERATOR,
      },
    });
    return this.tokenResponse(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.tokenResponse(user.id, user.email, user.role);
  }

  private tokenResponse(id: string, email: string, role: UserRole) {
    const accessToken = this.jwt.sign({ sub: id, email, role });
    return { accessToken, user: { id, email, role } };
  }
}
