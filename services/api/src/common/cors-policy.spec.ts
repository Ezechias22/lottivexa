import { describe, expect, it, vi } from 'vitest';
import {
  API_CORS_ALLOWED_HEADERS,
  createCorsOriginCallback,
  isCorsOriginAllowed,
  parseCorsOrigins,
} from './cors-policy';

describe('API CORS policy', () => {
  it('allows the client application header used by the web apps', () => {
    expect(API_CORS_ALLOWED_HEADERS).toContain('X-Lottivexa-Client-App');
  });

  it('parses and normalizes the configured origin list', () => {
    expect(parseCorsOrigins(' https://tenant.example,https://shop.example/ , ')).toEqual([
      'https://tenant.example',
      'https://shop.example',
    ]);
  });

  it('allows exact origins and configured subdomains while rejecting other origins', () => {
    const allowed = ['https://lottivexa-tenant-web.onrender.com', 'https://*.lottivexa.com'];
    expect(isCorsOriginAllowed('https://lottivexa-tenant-web.onrender.com', allowed)).toBe(true);
    expect(isCorsOriginAllowed('https://tenant.lottivexa.com', allowed)).toBe(true);
    expect(isCorsOriginAllowed('https://office.tenant.lottivexa.com', allowed)).toBe(true);
    expect(isCorsOriginAllowed('https://lottivexa.com', allowed)).toBe(false);
    expect(isCorsOriginAllowed('https://not-lottivexa.com', allowed)).toBe(false);
    expect(isCorsOriginAllowed(undefined, allowed)).toBe(true);
  });

  it('returns a clear denial for an origin outside the allowlist', () => {
    const callback = vi.fn();
    createCorsOriginCallback(['https://tenant.example'])(
      'https://unknown.example',
      callback,
    );
    expect(callback).toHaveBeenCalledWith(expect.any(Error));
    expect(callback.mock.calls[0][0].message).toBe('CORS_ORIGIN_DENIED');
  });
});
