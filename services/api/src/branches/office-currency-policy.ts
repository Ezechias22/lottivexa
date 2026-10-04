import { currencyForCountry } from '../tenants/country-currency-policy';
import { officeCountryFromSettings } from './office-location-policy';

export function currencyForOffice(settings: unknown, tenantCountryCode: string | null | undefined, fallbackCurrency = 'USD') {
  const countryCode = officeCountryFromSettings(settings, tenantCountryCode);
  return currencyForCountry(countryCode) ?? fallbackCurrency.toUpperCase();
}
