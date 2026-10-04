export const REFRESH_TOKEN_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

/** Refresh tokens use a sliding one-year lifetime and rotate on refresh. */
export function refreshTokenExpiry(now = new Date()): Date {
  return new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS);
}
