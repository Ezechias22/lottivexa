import { describe, expect, it } from 'vitest';
import { COUNTRY_CURRENCY, currencyForCountry, freeMaryajOdds } from './country-currency-policy';

describe('country currency policy', () => {
  it('maps the United States account to USD', () => {
    expect(currencyForCountry('US')).toBe('USD');
  });

  it('maps the other supported account currencies', () => {
    expect(currencyForCountry('HT')).toBe('HTG');
    expect(currencyForCountry('CA')).toBe('CAD');
    expect(currencyForCountry('FR')).toBe('EUR');
    expect(currencyForCountry('ZZ')).toBeUndefined();
  });

  it('sets United States free Maryaj to a fixed $50 payout per winning line', () => {
    expect(freeMaryajOdds('US', '120')).toBe('50');
  });

  it('preserves the configured free Maryaj odds outside the United States', () => {
    expect(freeMaryajOdds('HT', '120')).toBe('120');
    expect(freeMaryajOdds(null, '120')).toBe('120');
  });

  it('only exposes country codes with a currency mapping', () => {
    expect(Object.keys(COUNTRY_CURRENCY)).toContain('US');
    expect(new Set(Object.keys(COUNTRY_CURRENCY)).size).toBe(Object.keys(COUNTRY_CURRENCY).length);
  });
});
