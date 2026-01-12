import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'Lỗi hệ thống';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const errorObj = exceptionResponse as Record<string, unknown>;

      if (Array.isArray(errorObj.message)) {
        message =
          typeof errorObj.message[0] === 'string'
            ? errorObj.message[0]
            : 'Lỗi dữ liệu đầu vào';
      } else if (typeof errorObj.message === 'string') {
        message = errorObj.message;
      } else if (typeof errorObj.error === 'string') {
        message = errorObj.error;
      }
    }

    switch (status as HttpStatus) {
      case HttpStatus.TOO_MANY_REQUESTS:
        message =
          'Bạn gửi quá nhiều yêu cầu liên tục, vui lòng thử lại sau ít phút';
        break;

      case HttpStatus.INTERNAL_SERVER_ERROR:
        message = 'Chúng tôi hiện đang bảo trì, vui lòng thử lại sau';
        break;
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      data: null,
    });
  }
}
