type OfficeKind = 'OFFICE' | 'CENTRAL';

function settingsRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function resolveOfficeCountry(value: unknown, fallback: string | null | undefined): string {
  const selected = typeof value === 'string' ? value.trim().toUpperCase() : '';
  const defaultCountry = typeof fallback === 'string' ? fallback.trim().toUpperCase() : '';
  return selected || defaultCountry || 'HT';
}

export function officeCountryFromSettings(settings: unknown, fallback: string | null | undefined): string {
  return resolveOfficeCountry(settingsRecord(settings).countryCode, fallback);
}

export function officeSettings(
  existing: unknown,
  officeKind: OfficeKind,
  countryCode: string,
): Record<string, unknown> {
  return {
    ...settingsRecord(existing),
    officeKind,
    countryCode: resolveOfficeCountry(countryCode, 'HT'),
  };
}
