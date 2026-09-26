'use client';

import { drawLabel } from './draw-label';

type Ticket = Record<string, any>;

const money = (value: unknown) => {
  const number = Number(value ?? 0);
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
};

const dateTime = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-HT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const statuses: Record<string, string> = {
  PENDING: 'AN ATANT', VALID: 'VALAB', WINNER: 'GAYAN', LOSER: 'PEDI',
  PAID: 'PEYE', CANCELLED: 'ANILE', VOID: 'ANILE', EXPIRED: 'EKSPIRE',
};

function selection(line: Ticket) {
  const raw = String(line.selectionKey ?? line.selection ?? '—');
  return raw.split('@')[0].replaceAll('-', ' × ');
}

function option(line: Ticket) {
  const raw = String(line.selectionKey ?? line.selection ?? '');
  const value = raw.split('@')[1] ?? line.resultPosition;
  return value ? `OP${value}` : '';
}

function shortBetType(line: Ticket) {
  const raw = String(line.betType?.code ?? line.betType?.name ?? line.betTypeName ?? line.betTypeCode ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.includes('LOTO3') || raw === 'LT3') return 'LT3';
  if (raw.includes('LOTO4') || raw === 'LT4') return 'LT4';
  if (raw.includes('LOTO5') || raw === 'LT5') return 'LT5';
  return 'BL';
}

export default function PrintReceipt({
  ticket,
  businessName,
  branchName,
}: {
  ticket: Ticket | null;
  businessName: string;
  branchName?: string;
  // Keep compatibility with the POS page; receipts use `$` by design.
  currency?: string;
}) {
  if (!ticket) return null;

  const branch = ticket.merchant?.branch ?? ticket.branch ?? {};
  const draw = ticket.draw ?? {};
  const lines: Ticket[] = Array.isArray(ticket.lines) ? ticket.lines : [];
  const drawName = draw.game
    ? drawLabel(draw, 'ht', true)
    : String(ticket.drawName ?? ticket.game?.name ?? ticket.gameName ?? 'Lotri');
  const number = ticket.ticketNumber ?? ticket.id ?? '—';
  const qrValue = String(ticket.qrCode ?? ticket.barcode ?? number ?? '').trim();
  const qrSource = qrValue.startsWith('data:image/')
    ? qrValue
    : qrValue
      ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(qrValue)}`
      : '';
  const potential = Number(ticket.potentialWin ?? lines.reduce(
    (sum: number, line: Ticket) => sum + Number(line.potentialWin ?? 0), 0,
  ));

  return (
    <article className="print-receipt" aria-hidden="true">
      <header className="receipt-brand">
        <p className="receipt-eyebrow">RESI BOLET</p>
        <h1>{businessName || ticket.businessName || 'Biwo Bolet'}</h1>
        {(branch.name || branchName) && <p className="receipt-strong">{branch.name ?? branchName}</p>}
        {branch.address && <p>{branch.address}</p>}
        {branch.phone && <p>{branch.phone}</p>}
      </header>

      <section className="receipt-ticket-number">
        <span>NIMEWO TIKÈ</span>
        <strong>{number}</strong>
      </section>

      <section className="receipt-meta">
        <div><span>Dat / lè</span><strong>{dateTime(ticket.createdAt)}</strong></div>
      </section>

      <section className="receipt-draw">
        <p className="receipt-section-label">DETAY TIRAJ</p>
        <p className="receipt-draw-name">{drawName}</p>
        {draw.drawDate && <div><span>Dat tiraj</span><strong>{dateTime(draw.drawDate).split(' ')[0]}</strong></div>}
        {draw.closesAt && <div><span>Fèmti</span><strong>{dateTime(draw.closesAt)}</strong></div>}
      </section>

      <section className="receipt-bets">
        <div className="receipt-table-heading"><span>JWÈT / NIMEWO</span><span>PRI</span></div>
        {lines.map((line, index) => (
          <div className="receipt-bet" key={line.id ?? index}>
            <div className="receipt-bet-main">
              <strong className="receipt-option">{option(line)} {shortBetType(line)}</strong>
              <strong className="receipt-selection">{selection(line)}</strong>
              <strong className="receipt-stake">{line.isPromotional || line.isFree || line.promotional ? 'GRATIS' : money(line.stake)}</strong>
            </div>
            {line.isWinner === true && <p className="receipt-line-win">GAYAN: {money(line.potentialWin)}</p>}
          </div>
        ))}
      </section>

      <section className="receipt-totals">
        <div><span>Kantite liy</span><strong>{lines.length}</strong></div>
        <div className="receipt-total"><span>TOTAL PARYAJ</span><strong>{money(ticket.amount)}</strong></div>
        {potential > 0 && <div className="receipt-potential"><span>GANYAN POSIB</span><strong>{money(potential)}</strong></div>}
      </section>

      <div className="receipt-status">ESTATI: <strong>{statuses[String(ticket.status ?? 'VALID').toUpperCase()] ?? ticket.status ?? 'VALAB'}</strong></div>
      {(ticket.barcode || number) && <section className="receipt-code"><span>KÒD VERIFIKASYON</span><strong>{ticket.barcode ?? number}</strong></section>}
      {qrSource && <section className="receipt-qr"><span>ESKANE POU VERIFYE</span><img src={qrSource} alt="QR code pou verifye tikè a" /></section>}
      <footer className="receipt-footer">Kenbe resi sa a pou verifye tikè a. Tcheke nimewo ak tiraj la. Jwe ak responsabilite.</footer>
    </article>
  );
}
