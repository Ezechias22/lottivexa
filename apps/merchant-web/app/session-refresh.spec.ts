import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshWebSession } from './session-refresh';

function stubStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  return values;
}

afterEach(() => vi.unstubAllGlobals());

describe('merchant web session refresh', () => {
  it('shares one refresh request between simultaneous API failures', async () => {
    const values = stubStorage({ merchant_access: 'expired', merchant_refresh: 'refresh-1' });
    vi.stubGlobal('navigator', {});
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accessToken: 'access-2', refreshToken: 'refresh-2',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.all([
      refreshWebSession('https://api.example/api/v1', 'merchant', 'expired'),
      refreshWebSession('https://api.example/api/v1', 'merchant', 'expired'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results[0]).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    expect(results[1]).toEqual(results[0]);
    expect(values.get('merchant_access')).toBe('access-2');
    expect(values.get('merchant_refresh')).toBe('refresh-2');
  });

  it('keeps stored credentials when the API is temporarily unavailable', async () => {
    const values = stubStorage({ merchant_access: 'expired', merchant_refresh: 'refresh-1' });
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('temporarily unavailable', { status: 503 })));

    await expect(refreshWebSession('https://api.example/api/v1', 'merchant', 'expired'))
      .rejects.toThrow('SESSION_REFRESH_UNAVAILABLE_503');
    expect(values.get('merchant_access')).toBe('expired');
    expect(values.get('merchant_refresh')).toBe('refresh-1');
  });
});
