import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<any>();
    const req = ctx.getRequest<any>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    const prismaError = error && typeof error === 'object'
      ? error as { code?: unknown; meta?: { target?: unknown } }
      : undefined;
    if (prismaError?.code === 'P2002') {
      const target = Array.isArray(prismaError.meta?.target)
        ? prismaError.meta.target.join(',')
        : String(prismaError.meta?.target ?? '');
      const fields = target.replace(/[^a-z]/gi, '').toLowerCase();
      status = HttpStatus.CONFLICT;
      if (fields.includes('username')) {
        code = 'USERNAME_ALREADY_EXISTS';
        message = 'USERNAME_ALREADY_EXISTS';
      } else if (fields.includes('merchantnumber')) {
        code = 'MERCHANT_NUMBER_ALREADY_EXISTS';
        message = 'MERCHANT_NUMBER_ALREADY_EXISTS';
      } else if (fields.includes('email')) {
        code = 'EMAIL_ALREADY_EXISTS';
        message = 'EMAIL_ALREADY_EXISTS';
      } else {
        code = 'UNIQUE_CONSTRAINT_CONFLICT';
        message = 'UNIQUE_CONSTRAINT_CONFLICT';
      }
    }

    if (status !== HttpStatus.CONFLICT && error instanceof HttpException) {
      status = error.getStatus();
      const body = error.getResponse();
      if (typeof body === 'string') {
        code = body;
        message = body;
      } else if (body && typeof body === 'object') {
        const rawMessage = (body as any).message;
        if (Array.isArray(rawMessage)) {
          details = rawMessage;
          message = rawMessage.join('; ');
          code = status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : message;
        } else {
          message = String(rawMessage ?? (body as any).error ?? 'REQUEST_FAILED');
          code = message;
        }
      }
    }

    if (status >= 500) {
      console.error(
        JSON.stringify({
          level: 'error',
          requestId: req.id,
          method: req.method,
          path: req.url,
          status,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    res.status(status).json({
      error: {
        code,
        message,
        details,
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
