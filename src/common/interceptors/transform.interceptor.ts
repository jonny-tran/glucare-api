import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response as ExpressResponse, Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from '../decorators/response-message.decorator';
import { IPaginatedResponse } from '../interfaces/pagination.interface';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T | null;
  meta?: unknown;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse<ExpressResponse>();
        const request = ctx.getRequest<Request>();

        const message =
          this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) ||
          'Thực thi thành công';

        let responseData: unknown = data || null;
        let meta: unknown = undefined;

        if (this.isPaginated(data)) {
          meta = data.meta;
          responseData = data.data;
        }

        return {
          statusCode: response.statusCode,
          message: message,
          data: responseData as T,
          meta,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }

  private isPaginated(data: unknown): data is IPaginatedResponse<unknown> {
    return (
      !!data &&
      typeof data === 'object' &&
      'meta' in data &&
      'data' in data &&
      Array.isArray((data as IPaginatedResponse<unknown>).data)
    );
  }
}
