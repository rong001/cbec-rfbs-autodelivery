import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { sub?: string; role?: string } | undefined;
    const role = user?.role as UserRole | undefined;

    if (!role) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Authenticated user has no role claim',
        requiredRoles: required,
      });
    }

    if (!required.includes(role)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Role ${role} cannot access this resource; requires one of: ${required.join(', ')}`,
        role,
        requiredRoles: required,
      });
    }

    return true;
  }
}
