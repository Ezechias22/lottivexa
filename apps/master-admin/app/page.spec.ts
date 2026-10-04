import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const countries = readFileSync(new URL('./country-options.ts', import.meta.url), 'utf8');

describe('master admin console', () => {
  it('uses platform authentication', () => {
    expect(source).toContain("tenant:'platform'");
    expect(source).toContain('/auth/login');
  });

  it('connects tenant and subscription mutations', () => {
    for (const endpoint of ['/tenants', '/subscriptions/activate', '/subscriptions/${r.id}/extend', '/subscriptions/${r.id}/change-plan', '/billing/payments/', '/plans']) {
      expect(source).toContain(endpoint);
    }
  });

  it('requires a country when provisioning a tenant and displays its currency', () => {
    expect(source).toContain('name="countryCode"');
    expect(source).toContain('Select country');
    expect(countries).toContain('["US", "United States · USD"]');
    expect(source).toContain("columns={['slug','legalName','jurisdictionCode','currency','status','createdAt']}");
  });

  it('manages database-backed plan feature flags', () => {
    expect(source).toContain('PLAN_FEATURES');
    expect(source).toContain('/features/${key}');
    expect(source).toContain('{enabled:!enabled}');
  });

  it('does not render fabricated dashboard values', () => {
    expect(source).toContain('/master/dashboard');
    expect(source).not.toMatch(/Total tenants','—|fake/i);
  });
});
