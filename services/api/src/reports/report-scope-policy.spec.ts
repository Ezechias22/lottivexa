import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseMerchantIds } from './report-scope-policy';

describe('report merchant filters', () => {
  it('accepts one merchant, comma-separated merchants, and repeated query values', () => {
    expect(parseMerchantIds('11111111-1111-4111-8111-111111111111')).toEqual(['11111111-1111-4111-8111-111111111111']);
    expect(parseMerchantIds('11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222'))
      .toEqual(['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']);
    expect(parseMerchantIds(['11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111']))
      .toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('rejects malformed merchant IDs before database lookup', () => {
    expect(() => parseMerchantIds('other-tenant')).toThrow(BadRequestException);
  });
});
