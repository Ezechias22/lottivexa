export const COUNTRY_CURRENCY = {
  HT: { name: 'Haiti', currency: 'HTG' },
  US: { name: 'United States', currency: 'USD' },
  CA: { name: 'Canada', currency: 'CAD' },
  DO: { name: 'Dominican Republic', currency: 'DOP' },
  JM: { name: 'Jamaica', currency: 'JMD' },
  BS: { name: 'Bahamas', currency: 'BSD' },
  BB: { name: 'Barbados', currency: 'BBD' },
  BZ: { name: 'Belize', currency: 'BZD' },
  TT: { name: 'Trinidad and Tobago', currency: 'TTD' },
  GY: { name: 'Guyana', currency: 'GYD' },
  SR: { name: 'Suriname', currency: 'SRD' },
  MX: { name: 'Mexico', currency: 'MXN' },
  BR: { name: 'Brazil', currency: 'BRL' },
  AR: { name: 'Argentina', currency: 'ARS' },
  BO: { name: 'Bolivia', currency: 'BOB' },
  CL: { name: 'Chile', currency: 'CLP' },
  CO: { name: 'Colombia', currency: 'COP' },
  CR: { name: 'Costa Rica', currency: 'CRC' },
  CU: { name: 'Cuba', currency: 'CUP' },
  EC: { name: 'Ecuador', currency: 'USD' },
  SV: { name: 'El Salvador', currency: 'USD' },
  GT: { name: 'Guatemala', currency: 'GTQ' },
  HN: { name: 'Honduras', currency: 'HNL' },
  NI: { name: 'Nicaragua', currency: 'NIO' },
  PA: { name: 'Panama', currency: 'USD' },
  PY: { name: 'Paraguay', currency: 'PYG' },
  PE: { name: 'Peru', currency: 'PEN' },
  UY: { name: 'Uruguay', currency: 'UYU' },
  VE: { name: 'Venezuela', currency: 'VES' },
  PR: { name: 'Puerto Rico', currency: 'USD' },
  GB: { name: 'United Kingdom', currency: 'GBP' },
  FR: { name: 'France', currency: 'EUR' },
  ES: { name: 'Spain', currency: 'EUR' },
  DE: { name: 'Germany', currency: 'EUR' },
  PT: { name: 'Portugal', currency: 'EUR' },
  IT: { name: 'Italy', currency: 'EUR' },
  NL: { name: 'Netherlands', currency: 'EUR' },
  BE: { name: 'Belgium', currency: 'EUR' },
  CH: { name: 'Switzerland', currency: 'CHF' },
  IE: { name: 'Ireland', currency: 'EUR' },
  AU: { name: 'Australia', currency: 'AUD' },
  NZ: { name: 'New Zealand', currency: 'NZD' },
  JP: { name: 'Japan', currency: 'JPY' },
  CN: { name: 'China', currency: 'CNY' },
  IN: { name: 'India', currency: 'INR' },
  PH: { name: 'Philippines', currency: 'PHP' },
  NG: { name: 'Nigeria', currency: 'NGN' },
  GH: { name: 'Ghana', currency: 'GHS' },
  ZA: { name: 'South Africa', currency: 'ZAR' },
} as const;

export type CountryCode = keyof typeof COUNTRY_CURRENCY;
export const SUPPORTED_COUNTRY_CODES = Object.keys(COUNTRY_CURRENCY) as CountryCode[];

export function currencyForCountry(countryCode: string): string | undefined {
  return COUNTRY_CURRENCY[countryCode.toUpperCase() as CountryCode]?.currency;
}

/** Promotional Maryaj odds are captured on each ticket when it is sold. */
export function freeMaryajOdds(countryCode: string | null | undefined, configuredOdds: string): string {
  return countryCode?.toUpperCase() === 'US' ? '50' : configuredOdds;
}
