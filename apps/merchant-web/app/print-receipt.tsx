'use client';

import { useMerchantLanguage } from './language-switcher';
import { receiptBrandName, receiptDrawName, receiptLineRows, receiptStatus } from './receipt-export';

type Ticket = Record<string, any>;
const amount = (value: unknown) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0));
const currencySymbol = (currency: string) => currency === 'HTG' ? 'G' : currency === 'USD' ? '$' : currency + ' ';

export default function PrintReceipt({ ticket, businessName, logoUrl, branchName, currency = 'USD' }: { ticket: Ticket | null; businessName: string; logoUrl?: string; branchName?: string; currency?: string }) {
  const { language } = useMerchantLanguage();
  if (!ticket) return null;
  const receipt = { ...ticket, businessName, branchName: branchName ?? ticket.branchName, currency };
  const brand = receiptBrandName(receipt);
  const branch = String(receipt.branchName ?? '').trim();
  const draw = receiptDrawName(receipt, language);
  const date = ticket.createdAt ? new Date(ticket.createdAt) : null;
  const saleDate = date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(language === 'fr' ? 'fr-FR' : 'fr-HT', { timeZone: 'America/Port-au-Prince', dateStyle: 'short', timeStyle: 'short' })
    : '';
  const rows = receiptLineRows(receipt, language);
  const currencyMark = currencySymbol(String(currency).toUpperCase());
  const winningAmount = Number(ticket.winning?.winningAmount ?? ticket.winningAmount ?? 0);
  const code = String(ticket.qrCode ?? ticket.ticketNumber ?? ticket.id ?? '');
  return <article className="print-receipt" aria-hidden="true" lang={language}>
    {(logoUrl || brand) && <header className="receipt-brand">{logoUrl && <img className="receipt-tenant-logo" src={logoUrl} alt="" />}{brand && <h1>{brand}</h1>}</header>}
    <div className="receipt-ticket"><span>{language === 'fr' ? 'TICKET' : 'TIKÈ'}</span><strong>{ticket.ticketNumber ?? ticket.id}</strong></div>
    <div className="receipt-draw"><span>{language === 'fr' ? 'TIRAGE' : 'TIRAJ'}</span><strong>{draw}</strong></div>
    {branch && <div className="receipt-branch"><span>{language === 'fr' ? 'SUCCURSALE' : 'BIWO'}</span><strong>{branch}</strong></div>}
    {saleDate && <div className="receipt-meta"><span>{language === 'fr' ? 'DATE / HEURE' : 'DAT / LÈ'}</span><strong>{saleDate}</strong></div>}
    <div className="receipt-table">
      <div className="receipt-row receipt-heading"><span>{language === 'fr' ? 'JEU' : 'JWÈT'}</span><span>{language === 'fr' ? 'NUMÉRO' : 'NIMEWO'}</span><span>{language === 'fr' ? 'MISE' : 'PRI'}</span></div>
      {rows.map((line, index) => <div className="receipt-bet" key={ticket.lines?.[index]?.id ?? index}>
        <div className="receipt-bet-main"><span className="receipt-bet-code">{line.label}</span><strong className="receipt-number">{line.number}</strong><strong className="receipt-stake">{line.price}</strong></div>
        {line.extra && <small className="receipt-bet-extra">{line.extra}</small>}
      </div>)}
    </div>
    <div className="receipt-total"><span>TOTAL</span><strong>{currencyMark}{amount(ticket.amount ?? ticket.totalAmount)}</strong></div>
    <div className="receipt-winning"><span>{language === 'fr' ? 'STATUT' : 'ESTATI'}</span><strong>{receiptStatus(ticket.status, language)}</strong></div>
    {winningAmount > 0 && <div className="receipt-winning"><span>{language === 'fr' ? 'GAIN CONFIRMÉ' : 'GEN KONFIME'}</span><strong>{currencyMark}{amount(winningAmount)}</strong></div>}
    <div className="receipt-code"><small>{language === 'fr' ? 'VÉRIFICATION' : 'VERIFYE'}</small><img className="receipt-qr" src={'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(code)} alt="QR" /><strong>{ticket.barcode ?? ticket.ticketNumber}</strong></div>
    <footer>{language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.'}</footer>
  </article>;
}
