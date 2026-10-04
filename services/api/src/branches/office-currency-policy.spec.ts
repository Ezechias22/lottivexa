import { describe, expect, it } from 'vitest';
import { currencyForOffice } from './office-currency-policy';

describe('office currency', () => {
  it('uses the currency for the office country rather than the tenant default', () => {
    expect(currencyForOffice({ countryCode: 'US' }, 'HT', 'HTG')).toBe('USD');
    expect(currencyForOffice({ countryCode: 'US', currency: 'HTG' }, 'HT', 'HTG')).toBe('USD');
    expect(currencyForOffice({ countryCode: 'HT' }, 'US', 'USD')).toBe('HTG');
  });

  it('uses the tenant country only for legacy offices without a country', () => {
    expect(currencyForOffice({}, 'US', 'HTG')).toBe('USD');
  });
});
