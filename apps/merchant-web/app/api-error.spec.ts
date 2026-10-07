import { describe, expect, it } from 'vitest';
import { apiErrorCode } from './api-error';

describe('merchant API error parsing', () => {
  it('returns the server code from the standard error envelope', () => {
    expect(apiErrorCode({ error: { code: 'NUMBER_BLOCKED', message: 'NUMBER_BLOCKED' } }, 400)).toBe('NUMBER_BLOCKED');
  });
  it('uses a stable HTTP fallback when the response has no code', () => {
    expect(apiErrorCode({}, 400)).toBe('HTTP_400');
  });
});
