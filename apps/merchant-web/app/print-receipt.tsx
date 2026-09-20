'use client';

import { statusLabel, useMerchantLanguage } from './language-switcher';
import { drawLabel } from './draw-label';

type Ticket = Record<string, any>;
const amount = (value: unknown) => new Intl.NumberFormat('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0));
const currencyMark = (_currency: string) => '$';
const safeDate = (value: unknown, language: 'ht' | 'fr') => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(language === 'fr' ? 'fr-FR' : 'fr-HT', { timeZone: 'America/Port-au-Prince', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
};

export default function PrintReceipt({ ticket, businessName, branchName, currency: defaultCurrency }: { ticket: Ticket | null; businessName: string; branchName?: string; currency?: string }) {
  const { language } = useMerchantLanguage();
  if (!ticket) return null;
  const branch = ticket.merchant?.branch ?? {};
  const merchant = ticket.merchant?.displayName ?? '';
  const currency = ticket.currency ?? defaultCurrency ?? 'USD';
  const mark = currencyMark(currency);
  const winningAmount = Number(ticket.winning?.winningAmount ?? 0);
  return <article className="print-receipt" aria-hidden="true" lang={language}>
    <header>
      <p className="receipt-eyebrow">{language === 'fr' ? 'TICKET DE LOTERIE' : 'TIKÈ BOLET'}</p>
      <h1>{businessName || 'Bolet'}</h1>
      <div className="receipt-branch">{language === 'fr' ? 'Succursale' : 'Biwo'} : {branch.name ?? branchName ?? '—'}</div>
      {branch.address && <div className="receipt-branch">{branch.address}</div>}
      {branch.phone && <div className="receipt-branch">{language === 'fr' ? 'Tél.' : 'Telefòn'} : {branch.phone}</div>}
    </header>
    <div className="receipt-ticket"><span>{language === 'fr' ? 'N° DU TICKET' : 'NIMEWO TIKÈ'}</span><strong>{ticket.ticketNumber ?? ticket.id}</strong><em>{statusLabel(String(ticket.status ?? 'VALID'), language)}</em></div>
    <div className="receipt-draw"><span>{language === 'fr' ? 'LOTERIE / TIRAGE' : 'LOTRI / TIRAJ'}</span><strong>{ticket.draw ? drawLabel(ticket.draw, language) : ticket.game?.name ?? ticket.gameName ?? 'Lotri'}</strong></div>
    {merchant && <div className="receipt-meta"><span>{language === 'fr' ? 'Vendeur' : 'Machann'}</span><strong>{merchant}{ticket.merchant?.merchantNumber ? ' · ' + ticket.merchant.merchantNumber : ''}</strong></div>}
    <div className="receipt-meta"><span>{language === 'fr' ? 'Date / heure' : 'Dat / lè'}</span><strong>{safeDate(ticket.createdAt, language)}</strong></div>
    <div className="receipt-table">
      <div className="receipt-row receipt-heading"><span>{language === 'fr' ? 'JEU / NUMÉRO' : 'JWÈT / NIMEWO'}</span><span>{language === 'fr' ? 'MISE' : 'PRI'}</span></div>
      {(ticket.lines ?? []).map((line: Ticket, index: number) => {
        const parts = String(line.selectionKey ?? line.selection ?? '').split('@');
        const selection = parts[0].replaceAll('-', ' × ');
        const position = parts[1];
        const dekabes = Number(line.winCount ?? 0) > 1;
        return <div className="receipt-row receipt-bet" key={line.id ?? index}>
          <div className="receipt-line-main">
            <small>{line.betType?.name ?? (language === 'fr' ? 'Bolet' : 'Bolet')}{line.isPromotional ? ' · ' + (language === 'fr' ? 'GRATUIT' : 'GRATIS') : ''}</small>
            <strong className="receipt-number">{selection}</strong>
            {position && <b className="receipt-position">OP {position}</b>}
            {dekabes && <small className="receipt-dekabes">{language === 'fr' ? 'DÉKABÈS' : 'DEKABÈS'} × {line.winCount}</small>}
            {line.isWinner === true && <small className="receipt-line-win">{language === 'fr' ? 'GAGNANT' : 'GENYEN'}</small>}
            {Number(line.potentialWin) > 0 && <small className="receipt-line-potential">{language === 'fr' ? 'Gain possible' : 'Gany posib'} : {mark}{amount(line.potentialWin)}</small>}
          </div>
          <strong className="receipt-stake">{line.isPromotional ? (language === 'fr' ? 'GRATUIT' : 'GRATIS') : mark + amount(line.stake)}</strong>
        </div>;
      })}
    </div>
    <div className="receipt-total"><span>{language === 'fr' ? 'TOTAL' : 'TOTAL'}</span><strong>{mark}{amount(ticket.amount)}</strong></div>
    <div className="receipt-potential"><span>{language === 'fr' ? 'GAIN POTENTIEL' : 'GANY POSIB'}</span><strong>{mark}{amount(ticket.potentialWin)}</strong></div>
    {winningAmount > 0 && <div className="receipt-winning"><span>{language === 'fr' ? 'GAIN CONFIRMÉ' : 'GANY KONFIME'}</span><strong>{mark}{amount(winningAmount)}</strong></div>}
    {ticket.barcode && <div className="receipt-code"><small>{language === 'fr' ? 'CODE-BARRES' : 'KÒD BAR'}</small><strong>{ticket.barcode}</strong></div>}
    <footer>{language === 'fr' ? 'Conservez ce ticket original pour vérifier le résultat et réclamer un gain.' : 'Kenbe tikè orijinal sa a pou verifye rezilta a epi reklame gany ou.'}</footer>
  </article>;
}
