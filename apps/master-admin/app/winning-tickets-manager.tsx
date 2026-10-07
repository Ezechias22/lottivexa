'use client';

type Props = { page: any; request: (path: string, init?: RequestInit) => Promise<any>; reload: (page?: number) => Promise<void> };

export default function WinningTicketsManager({ page, reload }: Props) {
  const items = page?.items ?? [];
  return <section className="panel master-winners"><div className="master-winners-heading"><div><small>WINNING TICKET REGISTER</small><h2>Winning tickets</h2></div><span>{page?.total ?? 0}</span></div>
    <div className="master-winners-list">{items.map((ticket: any) => <article key={ticket.id}><div><b>{ticket.ticketNumber}</b><small>{ticket.tenant?.legalName ?? ticket.tenant?.slug ?? '—'} · {ticket.merchant?.displayName ?? '—'} · {ticket.merchant?.branch?.name ?? '—'}</small><small>{ticket.draw?.game?.name ?? '—'} · {ticket.draw?.drawNumber ?? '—'}</small></div><div className="master-winners-amount"><strong>{ticket.winning?.winningAmount ?? '0'} {ticket.currencyCode ?? 'USD'}</strong><small>{ticket.status === 'PAID' || ticket.payout ? 'Paid' : 'Awaiting payment'}</small></div></article>)}</div>
    {!items.length && <p className="muted">No winning tickets were found.</p>}
    <div className="master-winners-pages"><button className="secondary" disabled={(page?.page ?? 1) <= 1} onClick={() => void reload((page?.page ?? 1) - 1)}>Previous</button><span>Page {page?.page ?? 1} of {Math.max(1, Math.ceil((page?.total ?? 0) / (page?.pageSize ?? 50)))}</span><button className="secondary" disabled={(page?.page ?? 1) * (page?.pageSize ?? 50) >= (page?.total ?? 0)} onClick={() => void reload((page?.page ?? 1) + 1)}>Next</button></div>
  </section>;
}
