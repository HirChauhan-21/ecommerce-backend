import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: any = 'Internal server error';
    let errorDetail: any = {};

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object') {
        message = (res as any).message || exception.message;
        errorDetail = (res as any).error || res;
      } else {
        message = res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetail = {
        name: exception.name,
        message: exception.message,
      };
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: message,
      // error: errorDetail,
      data: null,
    });
  }
}
