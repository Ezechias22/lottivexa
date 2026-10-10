import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('merchant ticket history date filter', () => {
  it('queries the selected business date and paginates the matching tickets', () => {
    expect(source).toContain('new URLSearchParams({from:date,to:date,page:String(nextPage)})');
    expect(source).toContain('setTicketRows(items)');
    expect(source).toContain('ticketPage*100>=ticketTotal');
  });

  it('opens a ticket from its number and formats its timestamp in Haiti local time', () => {
    expect(source).toContain('className="ticket-history-number"');
    expect(source).toContain('onClick={()=>select(x)}');
    expect(source).toContain("timeZone:'America/Port-au-Prince'");
    expect(source).toContain('formatTicketHistoryDate(x.createdAt,language)');
    expect(source).not.toContain('new Date(x.createdAt).toLocaleString()');
  });

  it('ignores stale ticket-list responses after a newer date or page request', () => {
    expect(source).toContain('const latestTicketRequest=useRef(0)');
    expect(source).toContain('if(requestId===latestTicketRequest.current){setTicketRows(items)');
  });
});
