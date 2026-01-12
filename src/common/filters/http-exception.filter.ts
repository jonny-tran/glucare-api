import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'Internal server error';
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const errorObj = exceptionResponse as Record<string, unknown>;
      message =
        (typeof errorObj.message === 'string' ? errorObj.message : null) ||
        (typeof errorObj.error === 'string'
          ? errorObj.error
          : 'Internal server error');
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      data: null,
    });
  }
}
