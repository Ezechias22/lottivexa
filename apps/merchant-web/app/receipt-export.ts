import { ticketDrawLabels } from './draw-label';
import { jsPDF } from 'jspdf';

type Ticket = Record<string, any>;
type Language = 'ht' | 'fr';

const money = (value: unknown) => Number(value ?? 0).toFixed(2);
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] ?? char));
const code = (line: Ticket) => {
  const raw = String(line.betType?.code ?? line.betType?.name ?? '').toUpperCase();
  if (raw.includes('MARYAJ') || raw.includes('MARIAGE')) return 'MJ';
  if (raw.includes('LOTO3') || raw.includes('LOTO 3')) return 'LT3';
  if (raw.includes('LOTO4') || raw.includes('LOTO 4')) return 'LT4';
  if (raw.includes('LOTO5') || raw.includes('LOTO 5')) return 'LT5';
  return 'BL';
};
const rows = (ticket: Ticket, language: Language): string[] => (ticket.lines ?? []).map((line: Ticket) => {
  const parts = String(line.selectionKey ?? line.selection ?? '').split('@');
  const position = parts[1] ? ` OP${parts[1]}` : '';
  const number = parts[0].replaceAll('-', ' × ');
  const free = line.isPromotional ? (language === 'fr' ? 'GRATUIT' : 'GRATIS') : `$${money(line.stake)}`;
  return `${position} ${code(line)} ${number} ${free}`.trim();
});
const drawNames = (ticket: Ticket, language: Language) => ticketDrawLabels(ticket, language) || (language === 'fr' ? 'Tirage' : 'Tiraj');

export function makeTicketPdf(ticket: Ticket, language: Language) {
  const lineRows = rows(ticket, language);
  const height = Math.max(90, 42 + lineRows.length * 6.2 + 35);
  const pdf = new jsPDF({ unit: 'mm', format: [58, height], compress: true });
  let y = 7;
  const write = (text: string, size = 8, bold = false) => { pdf.setFont('courier', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.text(text.slice(0, 31), 4, y); y += size * 0.45 + 2.3; };
  pdf.setTextColor(20, 43, 75);
  write(String(ticket.businessName ?? 'Bolet'), 13, true);
  write(language === 'fr' ? 'TICKET DE LOTERIE' : 'TIKÈ BOLET', 8, true);
  pdf.setDrawColor(130, 145, 165); pdf.line(4, y, 54, y); y += 4;
  pdf.setTextColor(20, 32, 51);
  write(`${language === 'fr' ? 'TICKET' : 'TIKÈ'}: ${ticket.ticketNumber ?? ticket.id}`, 8, true);
  write(`${language === 'fr' ? 'TIRAGE' : 'TIRAJ'}: ${drawNames(ticket, language)}`, 8, true);
  pdf.line(4, y, 54, y); y += 4;
  lineRows.forEach(line => write(line, 8, true));
  pdf.line(4, y, 54, y); y += 5;
  write(`TOTAL: $${money(ticket.amount)}`, 11, true);
  if (ticket.status && ticket.status !== 'VALID') write(`${language === 'fr' ? 'STATUT' : 'ESTATI'}: ${ticket.status}`, 8, true);
  y += 2; write(language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.', 7);
  return pdf;
}

export function downloadTicketPdf(ticket: Ticket, language: Language) {
  makeTicketPdf(ticket, language).save(`lottivexa-ticket-${ticket.ticketNumber ?? ticket.id}.pdf`);
}

function ticketSvg(ticket: Ticket, language: Language) {
  const lineRows = rows(ticket, language);
  const height = Math.max(420, 150 + lineRows.length * 30);
  const text = (value: string, x: number, y: number, size: number, weight = 400) => `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}px" font-weight="${weight}" fill="#142b4b">${esc(value)}</text>`;
  let y = 42;
  const body = [text(String(ticket.businessName ?? 'Bolet'), 24, y, 25, 800), text(language === 'fr' ? 'TICKET DE LOTERIE' : 'TIKÈ BOLET', 24, y + 30, 15, 700), `<line x1="24" y1="${y + 48}" x2="456" y2="${y + 48}" stroke="#9aaabd"/>`];
  y += 78;
  body.push(text(`${language === 'fr' ? 'TICKET' : 'TIKÈ'}: ${ticket.ticketNumber ?? ticket.id}`, 24, y, 15, 700)); y += 28;
  body.push(text(`${language === 'fr' ? 'TIRAGE' : 'TIRAJ'}: ${drawNames(ticket, language)}`, 24, y, 15, 700)); y += 28;
  y += 7;
  body.push(`<line x1="24" y1="${y}" x2="456" y2="${y}" stroke="#9aaabd"/>`); y += 30;
  lineRows.forEach(line => { body.push(text(line, 24, y, 16, 700)); y += 28; });
  body.push(`<line x1="24" y1="${y}" x2="456" y2="${y}" stroke="#16365f"/>`); y += 38;
  body.push(text(`TOTAL: $${money(ticket.amount)}`, 24, y, 22, 800)); y += 40;
  body.push(text(language === 'fr' ? 'Conservez ce ticket original.' : 'Kenbe tikè orijinal la.', 24, y, 13));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${height}" viewBox="0 0 480 ${height}"><rect width="480" height="${height}" fill="white"/>${body.join('')}</svg>`;
}

export async function ticketImageBlob(ticket: Ticket, language: Language): Promise<Blob> {
  const svg = ticketSvg(ticket, language);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('IMAGE_EXPORT_FAILED')); });
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d')?.drawImage(image, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('IMAGE_EXPORT_FAILED')), 'image/png'));
}

export async function downloadTicketImage(ticket: Ticket, language: Language) {
  const blob = await ticketImageBlob(ticket, language);
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `lottivexa-ticket-${ticket.ticketNumber ?? ticket.id}.png`; link.click(); URL.revokeObjectURL(url);
}

export async function shareTicket(ticket: Ticket, language: Language, format: 'pdf' | 'image') {
  const blob = format === 'pdf' ? makeTicketPdf(ticket, language).output('blob') : await ticketImageBlob(ticket, language);
  const extension = format === 'pdf' ? 'pdf' : 'png'; const mime = format === 'pdf' ? 'application/pdf' : 'image/png';
  const file = new File([blob], `lottivexa-ticket-${ticket.ticketNumber ?? ticket.id}.${extension}`, { type: mime });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) throw new Error('SHARE_NOT_SUPPORTED');
  await navigator.share({ title: `Ticket ${ticket.ticketNumber ?? ticket.id}`, files: [file] });
}
