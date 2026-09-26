import { StreamableFile } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export function jsonSafe<T>(value: T): T {
  // StreamableFile must reach Nest's HTTP adapter untouched. Converting it
  // to a plain object makes PDF endpoints return the stream metadata as JSON.
  if (value instanceof StreamableFile) return value;
  if (typeof value === 'bigint') return value.toString() as T;
  if (Array.isArray(value)) return value.map(jsonSafe) as T;
  if (value instanceof Date || value === null || typeof value !== 'object') return value;
  const serializable=value as {toJSON?:()=>unknown};
  if(typeof serializable.toJSON==='function') return jsonSafe(serializable.toJSON()) as T;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, jsonSafe(item)])) as T;
}

@Injectable()
export class JsonSafeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(jsonSafe));
  }
}
