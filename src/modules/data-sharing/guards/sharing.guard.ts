import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtPayload } from '../../auth/interfaces/auth.interface';
import { DataSharingService } from '../data-sharing.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

// Define Interface extending Express Request
interface RequestWithUser extends Request {
  user: JwtPayload;
  params: {
    [key: string]: string;
  };
  query: {
    [key: string]: string | undefined;
  };
}

@Injectable()
export class SharingGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private sharingService: DataSharingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user; // Now strongly typed

    if (!user || user.role !== 'DOCTOR') {
      // If user is Patient and accessing own data, pass.
      if (user?.role === 'PATIENT') return true;
      // If Admin, usually true.
      if (user?.role === 'ADMIN') return true;
    }

    // Safely access params and query
    let patientId: string | undefined = undefined;

    if (request.params && request.params.patientId) {
      patientId = request.params.patientId;
    } else if (request.params && request.params.id) {
      patientId = request.params.id;
    } else if (request.query && typeof request.query.patientId === 'string') {
      patientId = request.query.patientId;
    }

    if (!patientId) {
      // If we can't find patientId, we can't check sharing.
      // This is a policy decision. If no patientId is targeted, guard might be irrelevant or allow pass.
      return true;
    }

    const hasAccess = await this.sharingService.checkAccess(
      user.sub, // Doctor's UserID
      patientId,
      requiredPermission,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập dữ liệu bệnh nhân này (Chưa chia sẻ hoặc bị chặn).',
      );
    }

    return true;
  }
}
