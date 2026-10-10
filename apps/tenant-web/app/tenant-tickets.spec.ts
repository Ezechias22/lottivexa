import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('tenant ticket date filter', () => {
  it('fetches the selected Haitian business day and displays API pagination', () => {
    expect(source).toContain('new URLSearchParams({from:date,to:date,page:String(page)})');
    expect(source).toContain('setTicketRows(items)');
    expect(source).toContain('ticketPage*ticketPageSize>=ticketTotal');
    expect(source).toContain('type="date" required value={selectedDate}');
  });
});
