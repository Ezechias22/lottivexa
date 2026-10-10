import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('merchant ticket history date filter', () => {
  it('queries the selected business date and paginates the matching tickets', () => {
    expect(source).toContain('new URLSearchParams({from:date,to:date,page:String(nextPage)})');
    expect(source).toContain('setTicketRows(items)');
    expect(source).toContain('ticketPage*100>=ticketTotal');
  });
});
