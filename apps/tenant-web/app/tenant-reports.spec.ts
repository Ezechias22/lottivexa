import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./tenant-reports.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('tenant merchant commission report', () => {
  it('shows each selected report merchant with its applied rate and commission amount', () => {
    expect(source).toContain('report.byMerchant');
    expect(source).toContain('merchant.commissionRate');
    expect(source).toContain('merchant.commission');
    expect(source).toContain('Komisyon pa machann');
  });

  it('preserves the chosen date range instead of replacing it with the automatic default refresh', () => {
    expect(page).toContain('!document.hidden && tab !== "reports"');
    expect(source).toContain('request(`/reports/sales?${query}`)');
    expect(source).toContain('request(`/reports/draws?${query}`)');
  });

  it('prevents the initial report response and older filters from replacing the latest selected range', () => {
    expect(source).toContain('const latestReportRequest = useRef(0)');
    expect(source).toContain('const hasAppliedReportFilter = useRef(false)');
    expect(source).toContain('if (hasAppliedReportFilter.current) return;');
    expect(source).toContain('values && requestId === latestReportRequest.current');
  });
});
