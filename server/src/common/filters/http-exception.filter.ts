import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 50000;
    let message = '系统错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
        const msg = (exceptionResponse as any).message;
        message = Array.isArray(msg)
          ? msg.join(', ')
          : String(msg);
      } else {
        message = exception.message;
      }

      // 根据 HTTP 状态码映射业务错误码
      if (status === HttpStatus.BAD_REQUEST) {
        code = 40001;
      } else if (status === HttpStatus.UNAUTHORIZED) {
        code = 40101;
      } else if (status === HttpStatus.FORBIDDEN) {
        code = 40301;
      } else if (status === HttpStatus.NOT_FOUND) {
        code = 40401;
      } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
        code = 40029;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
    );

    response.status(status).json(ApiResponse.error(code, message));
  }
}
