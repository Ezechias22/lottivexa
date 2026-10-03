import { describe, expect, it } from 'vitest';
import { merchantRouteHash, parseMerchantRoute } from './merchant-navigation';

describe('merchant screen navigation', () => {
  it('restores a known section from the URL fragment', () => {
    expect(parseMerchantRoute('#history')).toEqual({ screen: 'history' });
  });

  it('keeps the searched ticket in a refreshable check route', () => {
    const hash = merchantRouteHash('check', 'TIKÈ 123/ABC');
    expect(hash).toBe('#check/TIK%C3%88%20123%2FABC');
    expect(parseMerchantRoute(hash)).toEqual({ screen: 'check', ticketReference: 'TIKÈ 123/ABC' });
  });

  it('falls back safely for unknown or malformed routes', () => {
    expect(parseMerchantRoute('#unknown')).toEqual({ screen: 'dashboard' });
    expect(parseMerchantRoute('#check/%E0%A4%A')).toEqual({ screen: 'dashboard' });
  });
});
