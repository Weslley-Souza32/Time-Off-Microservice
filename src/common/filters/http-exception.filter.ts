import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

type ErrorResponse = {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const body = this.buildResponseBody(status, exceptionResponse, request.url);

    response.status(status).json(body);
  }

  private buildResponseBody(
    statusCode: number,
    exceptionResponse: string | object | undefined,
    path: string,
  ): ErrorResponse {
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as {
        error?: string;
        message?: string | string[];
      };

      return {
        statusCode,
        error: response.error ?? this.defaultError(statusCode),
        message: response.message ?? this.defaultMessage(statusCode),
        timestamp: new Date().toISOString(),
        path,
      };
    }

    return {
      statusCode,
      error: this.defaultError(statusCode),
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : this.defaultMessage(statusCode),
      timestamp: new Date().toISOString(),
      path,
    };
  }

  private defaultError(statusCode: number): string {
    const status = HttpStatus[statusCode];

    if (!status) {
      return 'Error';
    }

    return status
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private defaultMessage(statusCode: number): string {
    if (statusCode === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      return 'Internal server error';
    }

    return 'Request failed';
  }
}
