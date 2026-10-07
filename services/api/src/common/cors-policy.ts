export const API_CORS_ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'X-Request-Id',
  'Idempotency-Key',
  'X-Lottivexa-Client-App',
];

export const API_CORS_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function wildcardCorsOriginMatches(origin: string, configuredOrigin: string): boolean {
  const wildcard = /^(https?):\/\/\*\.([^/:]+)(?::(\d+))?$/i.exec(configuredOrigin);
  if (!wildcard) return false;

  try {
    const parsed = new URL(origin);
    const scheme = wildcard[1].toLowerCase();
    const domain = wildcard[2].toLowerCase();
    const port = wildcard[3] ?? '';
    const hostname = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === `${scheme}:` &&
      hostname !== domain &&
      hostname.endsWith(`.${domain}`) &&
      parsed.port === port
    );
  } catch {
    return false;
  }
}

export function isCorsOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, '');
  return allowedOrigins.some(
    (allowed) =>
      normalizedOrigin === allowed || wildcardCorsOriginMatches(normalizedOrigin, allowed),
  );
}

export function createCorsOriginCallback(allowedOrigins: string[]) {
  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (isCorsOriginAllowed(origin, allowedOrigins)) return callback(null, true);
    return callback(new Error('CORS_ORIGIN_DENIED'));
  };
}
