import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const countries = readFileSync(new URL('./country-options.ts', import.meta.url), 'utf8');
const platformDashboard = readFileSync(new URL('./platform-dashboard.tsx', import.meta.url), 'utf8');
const platformDashboardStyles = readFileSync(new URL('./platform-dashboard.module.css', import.meta.url), 'utf8');
const masterStyles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

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

  it('keeps Master Admin dashboard panels and tenant sales readable on phones', () => {
    for (const label of ['Tenant', 'Tikè vann', 'Vant', 'Lajan']) {
      expect(platformDashboard).toContain(`data-label=\"${label}\"`);
    }
    expect(platformDashboardStyles).toContain('.tenantTable td::before{content:attr(data-label)');
    expect(platformDashboardStyles).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(masterStyles).toContain('.table-panel{max-width:100%;overflow-x:auto');
  });
});
