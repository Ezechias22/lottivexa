'use client';

import { useMerchantLanguage } from './language-switcher';
import { drawNameSessionLabel } from './draw-label';

type Ticket = Record<string, any>;
const amount = (value: unknown) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0));
const shortCode = (line: Ticket) => {
  const raw = String(line.betType?.code ?? line.betType?.name ?? line.betTypeName ?? line.betType ?? '').toUpperCase();
  if (raw.includes('BOUL') || raw.includes('PAIR') || raw.includes('PE')) return 'BL';
  if (raw.includes('LOTO3') || raw.includes('LOTO 3')) return 'LT3';
  if (raw.includes('LOTO4') || raw.includes('LOTO 4')) return 'LT4';
  if (raw.includes('LOTO5') || raw.includes('LOTO 5')) return 'LT5';
  if (raw.includes('MARYAJ') || raw.includes('MARIAGE')) return 'MJ';
  return 'BL';
};
const drawTimes = (ticket: Ticket) => {
  const draws = Array.isArray(ticket.ticketDraws) ? ticket.ticketDraws.map((item: Ticket) => item.draw).filter(Boolean) : [];
  if (!draws.length && ticket.draw) draws.push(ticket.draw);
  const labels = draws.map((draw: Ticket) => drawNameSessionLabel(draw, 'ht'));
  return [...new Set(labels)].filter(Boolean);
};
const lineText = (line: Ticket, free: string, copies = 1) => {
  const parts = String(line.selectionKey ?? line.selection ?? '').split('@');
  const number = parts[0].replaceAll('-', '×');
  const op = parts[1] ? `OP${parts[1]}` : '';
  const code = shortCode(line);
  const price = line.isPromotional ? free : `$${amount(line.stake)}${copies > 1 ? ` × ${copies}` : ''}`;
  return `${op ? `${op} ` : ''}${code} ${number} ${price}`;
};

export default function PrintReceipt({ ticket, businessName, branchName, currency: _currency }: { ticket: Ticket | null; businessName: string; branchName?: string; currency?: string }) {
  const { language } = useMerchantLanguage();
  if (!ticket) return null;
  const code = String(ticket.qrCode ?? ticket.ticketNumber ?? ticket.id ?? '');
  const free = language === 'fr' ? 'GRATUIT' : 'GRATIS';
  const status = String(ticket.status ?? 'VALID');
  const grouped = new Map<string, { line: Ticket; copies: number; winner: boolean; winCount: number }>();
  for (const line of ticket.lines ?? []) {
    const key = [line.betTypeId ?? line.betType?.id ?? line.betType?.code, line.selectionKey ?? line.selection, line.stake, line.isPromotional ? 'free' : 'paid'].join('|');
    const current = grouped.get(key);
    if (current) {
      current.copies += 1;
      current.winner ||= line.isWinner === true;
      current.winCount += Number(line.winCount ?? 0);
    } else grouped.set(key, { line, copies: 1, winner: line.isWinner === true, winCount: Number(line.winCount ?? 0) });
  }
  const receiptLines = [...grouped.values()];
  const draws = drawTimes(ticket);
  return <article className="print-receipt" aria-hidden="true" lang={language}>
    <header><h1>{businessName || 'Bolet'}</h1><strong>{language === 'fr' ? 'TICKET DE LOTERIE' : 'TIKÈ BOLET'}</strong><div>{branchName ?? ''}</div></header>
    <div className="receipt-ticket"><span>{language === 'fr' ? 'TICKET' : 'TIKÈ'}</span><strong>{ticket.ticketNumber ?? ticket.id}</strong></div>
    <div className="receipt-draw"><span>{draws.length > 1 ? (language === 'fr' ? 'TIRAGES' : 'TIRAJ YO') : (language === 'fr' ? 'TIRAGE' : 'TIRAJ')}</span><strong>{draws.length ? draws.join('\n') : (ticket.game?.name ?? ticket.gameName ?? 'Lotri')}</strong></div>
    <div className="receipt-meta"><span>{language === 'fr' ? 'DATE / HEURE' : 'DAT / LÈ'}</span><strong>{new Date(ticket.createdAt ?? Date.now()).toLocaleString(language === 'fr' ? 'fr-FR' : 'fr-HT', { timeZone: 'America/Port-au-Prince' })}</strong></div>
    <div className="receipt-table"><div className="receipt-row receipt-heading"><span>{language === 'fr' ? 'JEU / NUMÉRO' : 'JWÈT / NIMEWO'}</span><span>{language === 'fr' ? 'MISE' : 'PRI'}</span></div>
      {receiptLines.map(({ line, copies, winner, winCount }, index) => <div className="receipt-row receipt-bet" key={`${line.id ?? index}-${copies}`}><strong className="receipt-number">{lineText(line, free, copies)}</strong>{winCount > 1 && <small className="receipt-dekabes">DEKABÈS ×{winCount}</small>}{winner && <small className="receipt-line-win">{language === 'fr' ? 'GAGNANT' : 'GENYEN'}</small>}</div>)}
    </div>
    <div className="receipt-total"><span>TOTAL</span><strong>${amount(ticket.amount)}</strong></div>
    {status !== 'VALID' && <div className="receipt-winning"><span>{language === 'fr' ? 'STATUT' : 'ESTATI'}</span><strong>{status}</strong></div>}
    <div className="receipt-code"><small>{language === 'fr' ? 'VÉRIFICATION' : 'VERIFYE'}</small><img className="receipt-qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(code)}`} alt="QR" /><strong>{ticket.barcode ?? ticket.ticketNumber}</strong></div>
    <footer>{language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.'}</footer>
  </article>;
}
