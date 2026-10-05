import { ticketDrawLabels } from './draw-label';
import { jsPDF } from 'jspdf';
import { qrCodeMatrix, qrCodePath } from './qr-code';

type Ticket = Record<string, any>;
type Language = 'ht' | 'fr';
type ReceiptLine = { label: string; number: string; price: string; extra?: string };
type PdfBlock =
  | { kind: 'text'; lines: string[]; size: number; bold: boolean; gap: number }
  | { kind: 'logo'; dataUrl: string; width: number; height: number }
  | { kind: 'heading' }
  | { kind: 'qr' }
  | { kind: 'row'; line: ReceiptLine }
  | { kind: 'rule'; gap: number };

const money = (value: unknown, currency = 'USD') => {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    const digits = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
    return '$' + new Intl.NumberFormat('fr-HT', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(safeAmount);
  } catch {
    return '$' + safeAmount.toFixed(2);
  }
};
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
      : money(line.stake, currency);
    const winCount = Number(line.winCount ?? 0);
    const isWinner = line.isWinner === true || winCount > 0;
    // The API returns the confirmed total for this line, including dekabès.
    const linePayout = Number(line.winningAmount ?? 0);
    const extra = [
      winCount > 1 ? (language === 'fr' ? 'DÉKABÈS × ' : 'DEKABÈS × ') + winCount : '',
      isWinner ? (language === 'fr' ? 'GAGNANT ✓' : 'GENYEN ✓') : '',
      isWinner && Number.isFinite(linePayout) && linePayout > 0 ? money(linePayout, currency) : '',
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

function pdfBlocks(ticket: Ticket, language: Language, logo?: { dataUrl: string; width: number; height: number }) {
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

  if (logo) {
    blocks.push({ kind: 'logo', ...logo });
    bodyHeight += 15;
  }
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
  addText('TOTAL: ' + money(ticket.amount ?? ticket.totalAmount, currency), 11, true, 1);
  addText((language === 'fr' ? 'STATUT: ' : 'ESTATI: ') + receiptStatus(ticket.status, language), 8, true);
  const winningAmount = Number(ticket.winning?.winningAmount ?? ticket.winningAmount ?? 0);
  if (winningAmount > 0) addText((language === 'fr' ? 'GAIN CONFIRMÉ: ' : 'GEN KONFIME: ') + money(winningAmount, currency), 8, true);
  addText((language === 'fr' ? 'VÉRIFICATION: ' : 'VERIFYE: ') + receiptCode(ticket), 7.5);
  blocks.push({ kind: 'qr' });
  bodyHeight += 29;
  addText(language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.', 7, false, 0);
  return { blocks, height: Math.ceil(6 + bodyHeight + 5) };
}

export function makeTicketPdf(ticket: Ticket, language: Language, logo?: { dataUrl: string; width: number; height: number }) {
  const layout = pdfBlocks(ticket, language, logo);
  const pdf = new jsPDF({ unit: 'mm', format: [58, Math.max(65, layout.height)], compress: true });
  pdf.setFileId(stablePdfFileId(ticket));
  const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : new Date('2000-01-01T00:00:00.000Z');
  pdf.setCreationDate(Number.isNaN(createdAt.getTime()) ? new Date('2000-01-01T00:00:00.000Z') : createdAt);
  const left = 4;
  const numberX = 17;
  const right = 54;
  let y = 6;
  for (const block of layout.blocks) {
    if (block.kind === 'logo') {
      const scale = Math.min(42 / block.width, 12 / block.height);
      const width = block.width * scale;
      const height = block.height * scale;
      try { pdf.addImage(block.dataUrl, 'PNG', (58 - width) / 2, y, width, height); } catch { /* Keep receipt text if a browser cannot decode the uploaded logo. */ }
      y += 14;
      continue;
    }
    if (block.kind === 'rule') {
      pdf.setDrawColor(130, 145, 165);
      pdf.line(left, y, right, y);
      y += block.gap * 2 + 0.7;
      continue;
    }
    if (block.kind === 'qr') {
      const matrix = qrCodeMatrix(String(ticket.qrCode ?? receiptCode(ticket)));
      const quiet = 4;
      const dimension = matrix.length + quiet * 2;
      const qrSize = 27;
      const module = qrSize / dimension;
      const startX = (58 - qrSize) / 2;
      pdf.setFillColor(0, 0, 0);
      matrix.forEach((row, rowIndex) => row.forEach((dark, columnIndex) => {
        if (dark) pdf.rect(startX + (columnIndex + quiet) * module, y + (rowIndex + quiet) * module, module + 0.015, module + 0.015, 'F');
      }));
      y += qrSize + 2;
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

async function loadReceiptLogo(ticket: Ticket): Promise<{ dataUrl: string; width: number; height: number } | undefined> {
  const source = String(ticket.logoUrl ?? '').trim();
  if (!source || (!source.startsWith('data:image/') && !source.startsWith('https://'))) return undefined;
  try {
    const image = new Image();
    if (source.startsWith('https://')) image.crossOrigin = 'anonymous';
    image.src = source;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('LOGO_LOAD_FAILED')); });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return undefined;
    const scale = Math.min(1, 512 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
  } catch {
    return undefined;
  }
}

export async function downloadTicketPdf(ticket: Ticket, language: Language) {
  const blob = await ticketPdfBlob(ticket, language);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lottivexa-ticket-' + (ticket.ticketNumber ?? ticket.id) + '.pdf';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Both PDF actions share one renderer so their receipt bytes and QR are identical. */
export async function ticketPdfBlob(ticket: Ticket, language: Language): Promise<Blob> {
  const logo = await loadReceiptLogo(ticket);
  return makeTicketPdf(ticket, language, logo).output('blob');
}

function stablePdfFileId(ticket: Ticket) {
  const source = String(ticket.qrCode ?? ticket.ticketNumber ?? ticket.id ?? 'lottivexa-ticket');
  let hash = 2166136261;
  for (const char of source) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return Array.from({ length: 4 }, (_, index) => ((hash + Math.imul(index, 0x9e3779b9)) >>> 0).toString(16).padStart(8, '0')).join('');
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

  const logo = String(ticket.logoUrl ?? '').trim();
  if (logo && (logo.startsWith('data:image/') || logo.startsWith('https://'))) {
    lines.push('<image x="160" y="12" width="160" height="44" preserveAspectRatio="xMidYMid meet" href="' + esc(logo) + '"/>');
    y = 74;
  }
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
  addText('TOTAL: ' + money(ticket.amount ?? ticket.totalAmount, currency), 22, 800, 7);
  addText((language === 'fr' ? 'STATUT: ' : 'ESTATI: ') + receiptStatus(ticket.status, language), 16, 700, 5);
  const winningAmount = Number(ticket.winning?.winningAmount ?? ticket.winningAmount ?? 0);
  if (winningAmount > 0) addText((language === 'fr' ? 'GAIN CONFIRMÉ: ' : 'GEN KONFIME: ') + money(winningAmount, currency), 16, 700, 5);
  addText((language === 'fr' ? 'VÉRIFICATION: ' : 'VERIFYE: ') + receiptCode(ticket), 14, 400, 4);
  const qr = qrCodeMatrix(String(ticket.qrCode ?? receiptCode(ticket)));
  const quiet = 4;
  const qrDimension = qr.length + quiet * 2;
  const qrSize = 220;
  const qrScale = qrSize / qrDimension;
  lines.push(`<g transform="translate(${(480 - qrSize) / 2} ${y}) scale(${qrScale})"><rect width="${qrDimension}" height="${qrDimension}" fill="#fff"/><path d="${qrCodePath(qr, quiet)}" fill="#000"/></g>`);
  y += qrSize + 18;
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
  const blob = format === 'pdf' ? await ticketPdfBlob(ticket, language) : await ticketImageBlob(ticket, language);
  const extension = format === 'pdf' ? 'pdf' : 'png';
  const mime = format === 'pdf' ? 'application/pdf' : 'image/png';
  const file = new File([blob], 'lottivexa-ticket-' + (ticket.ticketNumber ?? ticket.id) + '.' + extension, { type: mime });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) throw new Error('SHARE_NOT_SUPPORTED');
  await navigator.share({ title: 'Ticket ' + (ticket.ticketNumber ?? ticket.id), files: [file] });
}
