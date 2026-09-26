'use client';

import { useMerchantLanguage } from './language-switcher';
import { compactDrawLabel } from './draw-label';

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
const drawTime = (ticket: Ticket) => ticket.draw ? compactDrawLabel(ticket.draw, 'ht') : ticket.game?.name ?? ticket.gameName ?? 'Lotri';
const lineText = (line: Ticket, free: string) => {
  const parts = String(line.selectionKey ?? line.selection ?? '').split('@');
  const number = parts[0].replaceAll('-', '×');
  const op = parts[1] ? `OP${parts[1]}` : '';
  const code = shortCode(line);
  const price = line.isPromotional ? free : `$${amount(line.stake)}`;
  return `${op ? `${op} ` : ''}${code} ${number} ${price}`;
};

export default function PrintReceipt({ ticket, businessName, branchName, currency: _currency }: { ticket: Ticket | null; businessName: string; branchName?: string; currency?: string }) {
  const { language } = useMerchantLanguage();
  if (!ticket) return null;
  const code = String(ticket.qrCode ?? ticket.ticketNumber ?? ticket.id ?? '');
  const free = language === 'fr' ? 'GRATUIT' : 'GRATIS';
  const status = String(ticket.status ?? 'VALID');
  return <article className="print-receipt" aria-hidden="true" lang={language}>
    <header><h1>{businessName || 'Bolet'}</h1><strong>{language === 'fr' ? 'TICKET DE LOTERIE' : 'TIKÈ BOLET'}</strong><div>{branchName ?? ''}</div></header>
    <div className="receipt-ticket"><span>{language === 'fr' ? 'TICKET' : 'TIKÈ'}</span><strong>{ticket.ticketNumber ?? ticket.id}</strong></div>
    <div className="receipt-draw"><span>{language === 'fr' ? 'TIRAGE' : 'TIRAJ'}</span><strong>{drawTime(ticket)}</strong></div>
    <div className="receipt-meta"><span>{language === 'fr' ? 'DATE / HEURE' : 'DAT / LÈ'}</span><strong>{new Date(ticket.createdAt ?? Date.now()).toLocaleString(language === 'fr' ? 'fr-FR' : 'fr-HT', { timeZone: 'America/Port-au-Prince' })}</strong></div>
    <div className="receipt-table"><div className="receipt-row receipt-heading"><span>{language === 'fr' ? 'JEU / NUMÉRO' : 'JWÈT / NIMEWO'}</span><span>{language === 'fr' ? 'MISE' : 'PRI'}</span></div>
      {(ticket.lines ?? []).map((line: Ticket, index: number) => <div className="receipt-row receipt-bet" key={line.id ?? index}><strong className="receipt-number">{lineText(line, free)}</strong>{Number(line.winCount ?? 0) > 1 && <small className="receipt-dekabes">DEKABÈS ×{line.winCount}</small>}{line.isWinner === true && <small className="receipt-line-win">{language === 'fr' ? 'GAGNANT' : 'GENYEN'}</small>}</div>)}
    </div>
    <div className="receipt-total"><span>TOTAL</span><strong>${amount(ticket.amount)}</strong></div>
    <div className="receipt-potential"><span>{language === 'fr' ? 'GAIN POTENTIEL' : 'GANY POSIB'}</span><strong>${amount(ticket.potentialWin)}</strong></div>
    {status !== 'VALID' && <div className="receipt-winning"><span>{language === 'fr' ? 'STATUT' : 'ESTATI'}</span><strong>{status}</strong></div>}
    <div className="receipt-code"><small>{language === 'fr' ? 'VÉRIFICATION' : 'VERIFYE'}</small><img className="receipt-qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(code)}`} alt="QR" /><strong>{ticket.barcode ?? ticket.ticketNumber}</strong></div>
    <footer>{language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.'}</footer>
  </article>;
}
