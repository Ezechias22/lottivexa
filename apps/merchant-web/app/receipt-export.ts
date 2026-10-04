import { ticketDrawLabels } from './draw-label';
import { jsPDF } from 'jspdf';

type Ticket = Record<string, any>;
type Language = 'ht' | 'fr';
type ReceiptLine = { label: string; number: string; price: string; extra?: string };
type PdfBlock =
  | { kind: 'text'; lines: string[]; size: number; bold: boolean; gap: number }
  | { kind: 'heading' }
  | { kind: 'row'; line: ReceiptLine }
  | { kind: 'rule'; gap: number };

const money = (value: unknown) => Number(value ?? 0).toFixed(2);
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] ?? char));
const genericBrand = /^(bolet|lottivexa)$/i;

export function receiptBrandName(ticket: Ticket) {
  const name = String(ticket.businessName ?? '').trim();
  return name && !genericBrand.test(name) ? name : '';
}

export function receiptDrawName(ticket: Ticket, language: Language) {
  const fallback = language === 'fr' ? 'Tirage' : 'Tiraj';
  return (ticketDrawLabels(ticket, language) || fallback)
    .replace(/\s+\d{1,2}:\d{2}(?=\s*(?:\/|$))/g, '')
    .trim();
}

export function receiptStatus(status: unknown, language: Language) {
  const labels: Record<string, { ht: string; fr: string }> = {
    VALID: { ht: 'VALAB', fr: 'VALIDE' },
    WINNER: { ht: 'GENYEN', fr: 'GAGNANT' },
    LOSER: { ht: 'PÈDAN', fr: 'PERDANT' },
    PAID: { ht: 'PEYE', fr: 'PAYÉ' },
    PENDING: { ht: 'AN ATANT', fr: 'EN ATTENTE' },
    CANCELLED: { ht: 'ANILE', fr: 'ANNULÉ' },
    VOID: { ht: 'ANILE', fr: 'ANNULÉ' },
  };
  const key = String(status ?? 'VALID').toUpperCase();
  return labels[key]?.[language] ?? key;
}

export function receiptLineRows(ticket: Ticket, language: Language): ReceiptLine[] {
  const currency = String(ticket.currency ?? 'USD').toUpperCase();
  const prefix = currency === 'USD' ? '$' : currency === 'HTG' ? 'G' : currency + ' ';
  return (ticket.lines ?? []).map((line: Ticket) => {
    const raw = String(line.betType?.code ?? line.betType?.name ?? line.betTypeName ?? line.betType ?? '').toUpperCase();
    const code = raw.includes('MARYAJ') || raw.includes('MARIAGE') ? 'MJ'
      : raw.includes('LOTO3') || raw.includes('LOTO 3') ? 'LT3'
      : raw.includes('LOTO4') || raw.includes('LOTO 4') ? 'LT4'
      : raw.includes('LOTO5') || raw.includes('LOTO 5') ? 'LT5' : 'BL';
    const parts = String(line.selectionKey ?? line.selection ?? '').split('@');
    const number = parts[0].replaceAll('-', ' × ');
    const label = (parts[1] ? 'OP' + parts[1] + ' ' : '') + code;
    const price = line.isPromotional
      ? (language === 'fr' ? 'GRATUIT' : 'GRATIS')
      : prefix + money(line.stake);
    const winCount = Number(line.winCount ?? 0);
    const potentialWin = Number(line.potentialWin ?? 0);
    const promotionalPayout = line.isPromotional && Number.isFinite(potentialWin) && potentialWin > 0
      ? (language === 'fr' ? `Gain fixe : ${prefix}${money(potentialWin)} si gagnant` : `Peye ${prefix}${money(potentialWin)} si li genyen`)
      : '';
    const payoutPerHit = Number(line.potentialWin ?? line.winningAmount ?? line.payoutAmount ?? 0);
    const payoutHitCount = Number.isFinite(winCount) && winCount > 0 ? winCount : 1;
    const linePayout = payoutPerHit * payoutHitCount;
    const isWinner = line.isWinner === true || winCount > 0;
    const extra = [
      promotionalPayout,
      winCount > 1 ? (language === 'fr' ? 'DÉKABÈS × ' : 'DEKABÈS × ') + winCount : '',
      isWinner ? (language === 'fr' ? 'GAGNANT ✓' : 'GENYEN ✓') : '',
      isWinner && Number.isFinite(linePayout) && linePayout > 0 ? prefix + money(linePayout) : '',
    ].filter(Boolean).join(' · ');
    return { label, number, price, extra };
  });
}

function saleDate(ticket: Ticket, language: Language) {
  const value = ticket.createdAt ? new Date(ticket.createdAt) : null;
  if (!value || Number.isNaN(value.getTime())) return '';
  return value.toLocaleString(language === 'fr' ? 'fr-FR' : 'fr-HT', {
    timeZone: 'America/Port-au-Prince', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function receiptBranch(ticket: Ticket) {
  return String(ticket.branchName ?? ticket.merchant?.branch?.name ?? '').trim();
}

function receiptCode(ticket: Ticket) {
  return String(ticket.barcode ?? ticket.ticketNumber ?? ticket.id ?? '');
}

function wrapText(value: string, limit: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > limit) {
      if (current) { lines.push(current); current = ''; }
      for (let offset = 0; offset < word.length; offset += limit) lines.push(word.slice(offset, offset + limit));
      continue;
    }
    const next = current ? current + ' ' + word : word;
    if (next.length > limit && current) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function pdfBlocks(ticket: Ticket, language: Language) {
  const blocks: PdfBlock[] = [];
  let bodyHeight = 0;
  const addText = (value: string, size = 8, bold = false, gap = 1.2) => {
    if (!value) return;
    const lines = wrapText(value, Math.max(12, Math.floor(50 / (size * 0.21))));
    blocks.push({ kind: 'text', lines, size, bold, gap });
    bodyHeight += lines.length * (size * 0.45 + 1.5) + gap;
  };
  const addRule = (gap = 1.7) => {
    blocks.push({ kind: 'rule', gap });
    bodyHeight += gap * 2 + 0.7;
  };
  const addRow = (line: ReceiptLine) => {
    blocks.push({ kind: 'row', line });
    bodyHeight += Math.max(6.1, wrapText(line.number, 20).length * 4.8)
      + (line.extra ? wrapText(line.extra, 38).length * 4.2 : 0);
  };
  const addHeading = () => {
    blocks.push({ kind: 'heading' });
    bodyHeight += 6.1;
  };

  addText(receiptBrandName(ticket), 12, true, 1.2);
  addText((language === 'fr' ? 'TICKET: ' : 'TIKÈ: ') + String(ticket.ticketNumber ?? ticket.id ?? ''), 8, true);
  addText((language === 'fr' ? 'TIRAGE: ' : 'TIRAJ: ') + receiptDrawName(ticket, language), 8, true);
  const branch = receiptBranch(ticket);
  if (branch) addText((language === 'fr' ? 'SUCCURSALE: ' : 'BIWO: ') + branch, 7.5);
  const date = saleDate(ticket, language);
  if (date) addText((language === 'fr' ? 'DATE / HEURE: ' : 'DAT / LÈ: ') + date, 7.5);
  addRule();
  addHeading();
  for (const line of receiptLineRows(ticket, language)) addRow(line);
  addRule(2);

  const currency = String(ticket.currency ?? 'USD').toUpperCase();
  const prefix = currency === 'USD' ? '$' : currency === 'HTG' ? 'G' : currency + ' ';
  addText('TOTAL: ' + prefix + money(ticket.amount ?? ticket.totalAmount), 11, true, 1);
  addText((language === 'fr' ? 'STATUT: ' : 'ESTATI: ') + receiptStatus(ticket.status, language), 8, true);
  const winningAmount = Number(ticket.winning?.winningAmount ?? ticket.winningAmount ?? 0);
  if (winningAmount > 0) addText((language === 'fr' ? 'GAIN CONFIRMÉ: ' : 'GEN KONFIME: ') + prefix + money(winningAmount), 8, true);
  addText((language === 'fr' ? 'VÉRIFICATION: ' : 'VERIFYE: ') + receiptCode(ticket), 7.5);
  addText(language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.', 7, false, 0);
  return { blocks, height: Math.ceil(6 + bodyHeight + 5) };
}

export function makeTicketPdf(ticket: Ticket, language: Language) {
  const layout = pdfBlocks(ticket, language);
  const pdf = new jsPDF({ unit: 'mm', format: [58, Math.max(65, layout.height)], compress: true });
  const left = 4;
  const numberX = 17;
  const right = 54;
  let y = 6;
  for (const block of layout.blocks) {
    if (block.kind === 'rule') {
      pdf.setDrawColor(130, 145, 165);
      pdf.line(left, y, right, y);
      y += block.gap * 2 + 0.7;
      continue;
    }
    if (block.kind === 'row') {
      const numberLines = wrapText(block.line.number, 20);
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(8);
      pdf.text(block.line.label.slice(0, 12), left, y);
      numberLines.forEach((line, index) => pdf.text(line, numberX, y + index * 4.8));
      pdf.text(block.line.price, right, y, { align: 'right' });
      y += Math.max(6.1, numberLines.length * 4.8);
      if (block.line.extra) {
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(7);
        const extraLines = wrapText(block.line.extra, 38);
        pdf.text(extraLines, left, y, { lineHeightFactor: 1.7 });
        y += extraLines.length * 4.2;
      }
      continue;
    }
    if (block.kind === 'heading') {
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(7);
      pdf.text(language === 'fr' ? 'JEU' : 'JWÈT', left, y);
      pdf.text(language === 'fr' ? 'NUMÉRO' : 'NIMEWO', numberX, y);
      pdf.text(language === 'fr' ? 'MISE' : 'PRI', right, y, { align: 'right' });
      y += 6.1;
      continue;
    }
    pdf.setFont('courier', block.bold ? 'bold' : 'normal');
    pdf.setFontSize(block.size);
    pdf.text(block.lines, left, y, { lineHeightFactor: 1.8 });
    y += block.lines.length * (block.size * 0.45 + 1.5) + block.gap;
  }
  return pdf;
}

export function downloadTicketPdf(ticket: Ticket, language: Language) {
  makeTicketPdf(ticket, language).save('lottivexa-ticket-' + (ticket.ticketNumber ?? ticket.id) + '.pdf');
}

export function ticketSvg(ticket: Ticket, language: Language) {
  const text = (value: string, x: number, y: number, size: number, weight = 400, anchor = 'start') =>
    '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" font-family="Arial,sans-serif" font-size="' + size + 'px" font-weight="' + weight + '" fill="#142b4b">' + esc(value) + '</text>';
  const rule = (y: number) => '<line x1="24" y1="' + y + '" x2="456" y2="' + y + '" stroke="#9aaabd"/>';
  const lines: string[] = [];
  let y = 40;
  const addText = (value: string, size: number, weight = 700, gap = 12) => {
    if (!value) return;
    const wrapped = wrapText(value, Math.max(12, Math.floor(430 / (size * 0.62))));
    for (const row of wrapped) {
      lines.push(text(row, 24, y, size, weight));
      y += size * 1.45 + 5;
    }
    y += gap;
  };
  const addRule = (gap = 12) => { lines.push(rule(y)); y += gap; };

  addText(receiptBrandName(ticket), 24, 800, 8);
  addText((language === 'fr' ? 'TICKET: ' : 'TIKÈ: ') + String(ticket.ticketNumber ?? ticket.id ?? ''), 17, 700, 5);
  addText((language === 'fr' ? 'TIRAGE: ' : 'TIRAJ: ') + receiptDrawName(ticket, language), 16, 700, 5);
  const branch = receiptBranch(ticket);
  if (branch) addText((language === 'fr' ? 'SUCCURSALE: ' : 'BIWO: ') + branch, 14, 400, 3);
  const date = saleDate(ticket, language);
  if (date) addText((language === 'fr' ? 'DATE / HEURE: ' : 'DAT / LÈ: ') + date, 14, 400, 5);
  addRule(22);
  lines.push(text(language === 'fr' ? 'JEU' : 'JWÈT', 24, y, 14, 700));
  lines.push(text(language === 'fr' ? 'NUMÉRO' : 'NIMEWO', 150, y, 14, 700));
  lines.push(text(language === 'fr' ? 'MISE' : 'PRI', 456, y, 14, 700, 'end'));
  y += 24;
  for (const line of receiptLineRows(ticket, language)) {
    const numberLines = wrapText(line.number, 25);
    lines.push(text(line.label, 24, y, 16, 700));
    lines.push(text(numberLines[0], 150, y, 16, 700));
    lines.push(text(line.price, 456, y, 16, 700, 'end'));
    y += 28;
    for (const continuation of numberLines.slice(1)) {
      lines.push(text(continuation, 150, y, 16, 700));
      y += 22;
    }
    if (line.extra) {
      lines.push(text(line.extra, 36, y, 12, 500));
      y += 21;
    }
  }
  addRule(28);
  const currency = String(ticket.currency ?? 'USD').toUpperCase();
  const prefix = currency === 'USD' ? '$' : currency === 'HTG' ? 'G' : currency + ' ';
  addText('TOTAL: ' + prefix + money(ticket.amount ?? ticket.totalAmount), 22, 800, 7);
  addText((language === 'fr' ? 'STATUT: ' : 'ESTATI: ') + receiptStatus(ticket.status, language), 16, 700, 5);
  const winningAmount = Number(ticket.winning?.winningAmount ?? ticket.winningAmount ?? 0);
  if (winningAmount > 0) addText((language === 'fr' ? 'GAIN CONFIRMÉ: ' : 'GEN KONFIME: ') + prefix + money(winningAmount), 16, 700, 5);
  addText((language === 'fr' ? 'VÉRIFICATION: ' : 'VERIFYE: ') + receiptCode(ticket), 14, 400, 4);
  addText(language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.', 13, 400, 0);
  const height = Math.ceil(y + 18);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="' + height + '" viewBox="0 0 480 ' + height + '"><rect width="480" height="' + height + '" fill="white"/>' + lines.join('') + '</svg>';
}

export async function ticketImageBlob(ticket: Ticket, language: Language): Promise<Blob> {
  const svg = ticketSvg(ticket, language);
  const image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('IMAGE_EXPORT_FAILED')); });
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')?.drawImage(image, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('IMAGE_EXPORT_FAILED')), 'image/png'));
}

export async function downloadTicketImage(ticket: Ticket, language: Language) {
  const blob = await ticketImageBlob(ticket, language);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lottivexa-ticket-' + (ticket.ticketNumber ?? ticket.id) + '.png';
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareTicket(ticket: Ticket, language: Language, format: 'pdf' | 'image') {
  const blob = format === 'pdf' ? makeTicketPdf(ticket, language).output('blob') : await ticketImageBlob(ticket, language);
  const extension = format === 'pdf' ? 'pdf' : 'png';
  const mime = format === 'pdf' ? 'application/pdf' : 'image/png';
  const file = new File([blob], 'lottivexa-ticket-' + (ticket.ticketNumber ?? ticket.id) + '.' + extension, { type: mime });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) throw new Error('SHARE_NOT_SUPPORTED');
  await navigator.share({ title: 'Ticket ' + (ticket.ticketNumber ?? ticket.id), files: [file] });
}
