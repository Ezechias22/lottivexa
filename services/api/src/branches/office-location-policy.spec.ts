import { describe, expect, it } from 'vitest';
import { officeCountryFromSettings, officeSettings, resolveOfficeCountry } from './office-location-policy';

describe('office location policy', () => {
  it('keeps the selected office country without changing the company default', () => {
    expect(resolveOfficeCountry(' us ', 'HT')).toBe('US');
    expect(officeCountryFromSettings({ countryCode: 'US' }, 'HT')).toBe('US');
  });

  it('uses the company country for older offices with no saved country', () => {
    expect(officeCountryFromSettings({ officeKind: 'CENTRAL' }, 'HT')).toBe('HT');
  });

  it('preserves unrelated office settings while saving its country and kind', () => {
    expect(officeSettings({ printerId: 'printer-1' }, 'OFFICE', 'US')).toEqual({
      printerId: 'printer-1',
      officeKind: 'OFFICE',
      countryCode: 'US',
    });
  });
});
