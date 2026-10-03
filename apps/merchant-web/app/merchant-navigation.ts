export const merchantScreens = ['dashboard', 'sell', 'check', 'history', 'reports', 'results', 'cash', 'printer', 'more'] as const;

export type MerchantScreen = typeof merchantScreens[number];
export type MerchantRoute = { screen: MerchantScreen; ticketReference?: string };

const supportedScreens = new Set<string>(merchantScreens);

export function parseMerchantRoute(hash: string): MerchantRoute {
  const value = hash.trim().replace(/^#/, '');
  if (!value) return { screen: 'dashboard' };
  const separator = value.indexOf('/');
  const candidate = separator < 0 ? value : value.slice(0, separator);
  if (!supportedScreens.has(candidate)) return { screen: 'dashboard' };
  const screen = candidate as MerchantScreen;
  if (screen !== 'check' || separator < 0) return { screen };
  try {
    const ticketReference = decodeURIComponent(value.slice(separator + 1));
    return ticketReference ? { screen, ticketReference } : { screen };
  } catch {
    return { screen: 'dashboard' };
  }
}

export function merchantRouteHash(screen: MerchantScreen, ticketReference?: string): string {
  if (screen === 'check' && ticketReference?.trim()) {
    return `#check/${encodeURIComponent(ticketReference.trim())}`;
  }
  return `#${screen}`;
}
