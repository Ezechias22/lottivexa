import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ApiExceptionFilter } from './api-exception.filter';

function hostFor(json: ReturnType<typeof vi.fn>, status: ReturnType<typeof vi.fn>) {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ id: 'req-1', method: 'POST', url: '/api/v1/merchants' }),
    }),
  } as any;
}

describe('API exception envelope', () => {
  it('standardizes validation failures without leaking stack traces', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    new ApiExceptionFilter().catch(new BadRequestException({ message: ['amount must be numeric'] }), hostFor(json, status));
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'VALIDATION_ERROR', requestId: 'req-1' }) }));
    expect(JSON.stringify(json.mock.calls)).not.toContain('stack');
  });

  it('turns a duplicate tenant username into a conflict with a usable error code', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    new ApiExceptionFilter().catch(
      { code: 'P2002', meta: { target: ['tenantId', 'username'] } },
      hostFor(json, status),
    );
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'USERNAME_ALREADY_EXISTS', message: 'USERNAME_ALREADY_EXISTS' }),
    }));
  });

  it('returns a safe generic conflict for other unique constraints', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    new ApiExceptionFilter().catch({ code: 'P2002', meta: { target: ['tenantId', 'someId'] } }, hostFor(json, status));
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'UNIQUE_CONSTRAINT_CONFLICT' }),
    }));
  });
});
