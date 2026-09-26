type Row = { status?: string; count?: number; amount?: string };
type SalesReport = {
  period: { from: Date; to: Date };
  tickets: { count: number; sales: string; potentialWin: string; commission: string };
  payouts: { count: number; amount: string };
  commission: string;
  byStatus: Row[];
  byDay?: Array<{ day: string; count: number; amount: string }>;
  byGame?: Array<{ gameName: string; gameCode?: string; count: number; amount: string }>;
  byBranch?: Array<{ branchName: string; branchCode?: string; count: number; amount: string }>;
  biggestWins?: Array<{ ticketNumber: string; merchantName: string; gameName: string; drawNumber: string; amount: string }>;
};

const esc = (value: unknown) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\xFF]/g, '?');
const dollars = (value: unknown) => `$ ${Number(value ?? 0).toFixed(2)}`;
const text = (value: string, x: number, y: number, size = 10, bold = false) => `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${esc(value)}) Tj ET`;
const fill = (x: number, y: number, w: number, h: number, color: string) => `${color} rg ${x} ${y} ${w} ${h} re f 0 0 0 rg`;

function makePage(report: SalesReport, name: string, page: number, total: number, rows: string[]) {
  const out: string[] = [fill(0, 770, 612, 72, '0.07 0.18 0.35'), text(name, 36, 812, 19, true), text('RAPO LAVANT  /  RAPPORT DES VENTES', 36, 789, 11), text(`Paj ${page} / ${total}`, 510, 812, 9)];
  let y = 746;
  if (page === 1) {
    out.push(text(`Peryòd: ${report.period.from.toISOString()} - ${report.period.to.toISOString()}`, 36, y, 9), text('Lajan: $', 36, y - 16, 9), text(`Jenere: ${new Date().toISOString()}`, 36, y - 32, 9));
    y -= 58;
    const cards = [['Vant total', dollars(report.tickets.sales)], ['Tikè', String(report.tickets.count)], ['Gany posib', dollars(report.tickets.potentialWin)], ['Komisyon', dollars(report.commission)]];
    cards.forEach((card, i) => { const x = 36 + (i % 2) * 276; const cy = y - Math.floor(i / 2) * 58; out.push(fill(x, cy - 40, 258, 46, i % 2 ? '0.91 0.95 1' : '0.90 0.97 0.93'), text(card[0], x + 12, cy - 14, 9), text(card[1], x + 12, cy - 32, 14, true)); });
    y -= 130;
    out.push(text('REZIME', 36, y, 12, true), text(`Peman gayan: ${report.payouts.count}  |  Montan peye: ${dollars(report.payouts.amount)}`, 36, y - 22), text(`Komisyon tikè: ${dollars(report.tickets.commission)}  |  Tikè anrejistre: ${report.tickets.count}`, 36, y - 38));
    y -= 78;
  }
  if (rows.length) { out.push(text(rows[0], 36, y, 12, true)); y -= 22; for (const row of rows.slice(1)) { out.push(text(row, 44, y)); y -= 17; } }
  out.push(text('LOTTIVEXA  •  Rapò ofisyèl lavant', 36, 28, 8));
  return out.join('\n');
}

export function buildSalesPdf(report: SalesReport, businessName: string, _currency = 'USD') {
  const sections = [
    ['REZIME PA ESTATI', ...report.byStatus.map(row => `${row.status}: ${row.count} ticket(s), ${dollars(row.amount)}`)],
    ['VANT PA LOTRI', ...(report.byGame ?? []).map(row => `${row.gameCode ? `${row.gameCode}  ` : ''}${row.gameName}: ${row.count} tikè, ${dollars(row.amount)}`)],
    ['VANT PA JOU', ...(report.byDay ?? []).map(row => `${row.day}: ${row.count} tikè, ${dollars(row.amount)}`)],
    ['VANT PA BRANCH', ...(report.byBranch ?? []).map(row => `${row.branchCode ? `${row.branchCode}  ` : ''}${row.branchName}: ${row.count} tikè, ${dollars(row.amount)}`)],
    ['PI GWO GANY YO', ...(report.biggestWins ?? []).map(row => `${row.ticketNumber}  ${row.gameName} / ${row.drawNumber}: ${dollars(row.amount)}  (${row.merchantName})`)],
  ].filter(section => section.length > 1);
  const first = [`Period: ${report.period.from.toISOString()} - ${report.period.to.toISOString()}`, 'Currency: $', `Ticket count: ${report.tickets.count}`, `Gross sales: ${dollars(report.tickets.sales)}`, `Potential winnings: ${dollars(report.tickets.potentialWin)}`, `Ticket commissions: ${dollars(report.tickets.commission)}`, `Payout count: ${report.payouts.count}`, `Payout amount: ${dollars(report.payouts.amount)}`, `Processed commission: ${dollars(report.commission)}`];
  const pageRows: string[][] = [first];
  for (const section of sections) { for (let i = 0; i < section.length; i += 38) pageRows.push(section.slice(i, i + 38)); }
  const pages = pageRows.map((rows, i) => makePage(report, businessName, i + 1, pageRows.length, rows));
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>'];
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((commands, i) => { const content = 4 + i * 2; const normal = 3 + pages.length * 2; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${normal} 0 R /F2 ${normal + 1} 0 R >> >> /Contents ${content} 0 R >>`); objects.push(`<< /Length ${Buffer.byteLength(commands, 'latin1')} >>\nstream\n${commands}\nendstream`); });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const start = Buffer.byteLength(pdf, 'latin1'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
