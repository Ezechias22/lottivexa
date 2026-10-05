'use client';

import { useMerchantLanguage } from './language-switcher';
import { ticketDrawLabels } from './draw-label';
import { qrCodeDataUrl } from './qr-code';

type Ticket = Record<string, any>;
const money = (value: unknown, currency = 'USD') => { const code = /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'USD'; const amount = Number(value ?? 0); const safeAmount = Number.isFinite(amount) ? amount : 0; try { const digits = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits; return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(safeAmount); } catch { return '$' + safeAmount.toFixed(2); } };
const shortCode = (line: Ticket) => {
  const raw = String(line.betType?.code ?? line.betType?.name ?? line.betTypeName ?? line.betType ?? '').toUpperCase();
  if (raw.includes('BOUL') || raw.includes('PAIR') || raw.includes('PE')) return 'BL';
  if (raw.includes('LOTO3') || raw.includes('LOTO 3')) return 'LT3';
  if (raw.includes('LOTO4') || raw.includes('LOTO 4')) return 'LT4';
  if (raw.includes('LOTO5') || raw.includes('LOTO 5')) return 'LT5';
  if (raw.includes('MARYAJ') || raw.includes('MARIAGE')) return 'MJ';
  return 'BL';
};
const drawTime = (ticket: Ticket, language: 'ht' | 'fr') => ticketDrawLabels(ticket, language) || ticket.game?.name || ticket.gameName || (language === 'fr' ? 'Loterie' : 'Lotri');
const lineText = (line: Ticket, free: string, currency: string) => {
  const parts = String(line.selectionKey ?? line.selection ?? '').split('@');
  const number = parts[0].replaceAll('-', '×');
  const op = parts[1] ? `OP${parts[1]}` : '';
  const code = shortCode(line);
  const price = line.isPromotional ? free : money(line.stake, currency);
  return `${op ? `${op} ` : ''}${code} ${number} ${price}`;
};

export default function PrintReceipt({ ticket, businessName, logoUrl, branchName, currency: inputCurrency }: { ticket: Ticket | null; businessName: string; logoUrl?: string; branchName?: string; currency?: string }) {
  const { language } = useMerchantLanguage();
  if (!ticket) return null;
  const currency = String(ticket.currency ?? inputCurrency ?? 'USD');
  const code = String(ticket.qrCode ?? ticket.ticketNumber ?? ticket.id ?? '');
  const free = language === 'fr' ? 'GRATUIT' : 'GRATIS';
  const status = String(ticket.status ?? 'VALID');
  const winners = (ticket.lines ?? []).filter((line: Ticket) => line.isWinner === true).map((line: Ticket) => String(line.selectionKey ?? line.selection ?? '').split('@')[0].replaceAll('-', '×'));
  return <article className="print-receipt" aria-hidden="true" lang={language}>
    <header>{logoUrl&&<img className="receipt-tenant-logo" src={logoUrl} alt=""/>}{businessName.trim()&&<h1>{businessName.trim()}</h1>}<strong>{language === 'fr' ? 'TICKET DE LOTERIE' : 'TIKÈ BOLET'}</strong></header>
    <div className="receipt-ticket"><span>{language === 'fr' ? 'TICKET' : 'TIKÈ'}</span><strong>{ticket.ticketNumber ?? ticket.id}</strong></div>
    <div className="receipt-draw"><span>{language === 'fr' ? 'TIRAGE' : 'TIRAJ'}</span><strong>{drawTime(ticket, language)}</strong></div>
    <div className="receipt-meta"><span>{language === 'fr' ? 'DATE / HEURE' : 'DAT / LÈ'}</span><strong>{new Date(ticket.createdAt ?? Date.now()).toLocaleString(language === 'fr' ? 'fr-FR' : 'fr-HT', { timeZone: 'America/Port-au-Prince' })}</strong></div>
    <div className="receipt-table"><div className="receipt-row receipt-heading"><span>{language === 'fr' ? 'JEU / NUMÉRO' : 'JWÈT / NIMEWO'}</span><span>{language === 'fr' ? 'MISE' : 'PRI'}</span></div>
      {(ticket.lines ?? []).map((line: Ticket, index: number) => { const count = Number(line.winCount ?? 0); const won = line.isWinner === true || count > 0; const winnings = Number(line.winningAmount ?? 0); return <div className="receipt-row receipt-bet" key={line.id ?? index}><strong className="receipt-number">{lineText(line, free, currency)}</strong>{count > 1 && <small className="receipt-dekabes">DEKABÈS ×{count}</small>}{won && <small className="receipt-line-win">{language === 'fr' ? `GAGNANT${winnings > 0 ? ` · ${money(winnings, currency)}` : ''}` : `GENYEN${winnings > 0 ? ` · ${money(winnings, currency)}` : ''}`}</small>}</div>; })}
    </div>
    <div className="receipt-total"><span>TOTAL</span><strong>{money(ticket.amount, currency)}</strong></div>
    <div className="receipt-winning"><span>{language === 'fr' ? 'STATUT' : 'ESTATI'}</span><strong>{status}</strong></div>
    {winners.length > 0 && <div className="receipt-winning receipt-winners"><span>{language === 'fr' ? 'NUMÉROS GAGNANTS' : 'BOUL KI GENYEN'}</span><strong>{winners.join(' · ')}</strong></div>}
    <div className="receipt-code"><small>{language === 'fr' ? 'VÉRIFICATION' : 'VERIFYE'}</small><img className="receipt-qr" src={qrCodeDataUrl(code)} alt="QR" /><strong>{ticket.barcode ?? ticket.ticketNumber}</strong></div>
    <footer>{language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.'}</footer>
  </article>;
}
