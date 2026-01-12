import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from '../decorators/response-message.decorator';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T | null;
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
        const message =
          this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) ||
          'Success';

        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        const statusCode = response.statusCode ?? 200;

        return {
          statusCode,
          message,
          data: data || null,
        };
      }),
    );
  }
}
