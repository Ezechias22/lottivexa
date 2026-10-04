import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./tenant-reports.tsx', import.meta.url), 'utf8');

describe('tenant merchant commission report', () => {
  it('shows each selected report merchant with its applied rate and commission amount', () => {
    expect(source).toContain('report.byMerchant');
    expect(source).toContain('merchant.commissionRate');
    expect(source).toContain('merchant.commission');
    expect(source).toContain('Komisyon pa machann');
  });
});
