export function tenantTabFromSearch(
  search: string,
  availableTabs: readonly string[],
): string {
  const requested = new URLSearchParams(search).get("tab");
  return requested && availableTabs.includes(requested) ? requested : "dashboard";
}

export function tenantTabHref(href: string, tab: string): string {
  const url = new URL(href);
  url.searchParams.set("tab", tab);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function tenantMobileTabs(availableTabs: readonly string[]): string[] {
  return ["dashboard", "results", "reports", "tickets"].filter((tab) => availableTabs.includes(tab));
}
