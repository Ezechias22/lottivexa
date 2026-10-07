export function activeOperationalTicketFilter() {
  // Deleted tickets stay in the financial/audit ledger, but disappear from POS operations.
  return { events: { none: { type: 'DELETED' } } } as const;
}

export function isOperationallyDeleted(events: readonly { type: string }[]): boolean {
  return events.some(event => event.type === 'DELETED');
}
