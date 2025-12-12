import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseDto, ResponseStatus } from '../common/dtos/response.dto';
import { AppRequest } from '../decorators/types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AppRequest>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let details: unknown = null;

    if (isHttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };
        message = Array.isArray(responseObj.message)
          ? responseObj.message.join(', ')
          : responseObj.message || responseObj.error || message;
        details = responseObj;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorLog = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      message,
      userId: request.user?._id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    // Send consistent error response
    const errorResponse = new ResponseDto(
      details,
      message,
      ResponseStatus.ERROR,
    );

    response.status(status).json(errorResponse);
  }
}
