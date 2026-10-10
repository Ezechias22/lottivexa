import { reportRange } from '../reports/report-policy';

export const TICKET_SEARCH_PAGE_SIZE = 100;

export function ticketSearchRange(from?: string, to?: string) {
  if (from === undefined && to === undefined) return undefined;
  if (!from || !to) throw new Error('INVALID_DATE_RANGE');
  return reportRange(from, to);
}

export function ticketSearchPage(value?: string) {
  if (value === undefined) return undefined;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) {
    throw new Error('INVALID_TICKET_PAGE');
  }
  return page;
}
