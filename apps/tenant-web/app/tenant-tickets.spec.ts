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

  it('opens ticket details from the ticket number and removes the separate open action', () => {
    expect(source).toContain('onTicketOpen={onOpen}');
    expect(source).toContain('onOpenTicket={openTicket}');
    expect(source).toContain('className="tenant-ticket-number-button"');
    expect(source).not.toContain('tenant-ticket-open-button');
    expect(source).not.toContain('actions={(ticket)=><button');
  });

  it('formats ticket creation dates as local Haiti date and time instead of ISO', () => {
    expect(source).toContain('function formatTableDate(value: unknown, language: string)');
    expect(source).toContain('timeZone: "America/Port-au-Prince"');
    expect(source).toContain('year: "numeric"');
    expect(source).toContain('formatTableDate(raw, language)');
  });

  it('prevents an older date request from replacing the selected date results', () => {
    expect(source).toContain('const latestTicketRequest=useRef(0)');
    expect(source).toContain('if(requestId===latestTicketRequest.current){setTicketRows(items)');
  });
});
