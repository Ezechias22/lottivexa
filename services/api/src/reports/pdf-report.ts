type Row = { status?: string; count?: number; amount?: string };
type SalesReport = {
  period: { from: Date; to: Date };
  tickets: { count: number; sales: string; potentialWin: string; commission: string };
  payouts: { count: number; amount: string };
  commission: string;
  accounting?: { cancelledCount: number; cancelledAmount: string; netSales: string; deficit: string };
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
  const out: string[] = [fill(0, 930, 228, 70, '0.07 0.18 0.35'), text(name, 18, 970, 14, true), text('RAPO LAVANT', 18, 950, 10), text(`Paj ${page}/${total}`, 177, 970, 8)];
  let y = 910;
  if (page === 1) {
    out.push(text(`Peryòd: ${report.period.from.toISOString().slice(0, 10)} - ${report.period.to.toISOString().slice(0, 10)}`, 18, y, 7), text('Lajan: $', 18, y - 13, 8), text(`Jenere: ${new Date().toISOString().slice(0, 19)}Z`, 18, y - 26, 7));
    y -= 44;
    const cards = [['Vant total', dollars(report.tickets.sales)], ['Tikè', String(report.tickets.count)], ['Gany posib', dollars(report.tickets.potentialWin)], ['Komisyon', dollars(report.commission)]];
    cards.forEach((card, i) => { const cy = y - i * 35; out.push(fill(18, cy - 25, 192, 29, i % 2 ? '0.91 0.95 1' : '0.90 0.97 0.93'), text(`${card[0]}: ${card[1]}`, 26, cy - 17, 9, true)); });
    y -= 155;
    out.push(text('REZIME FINANS', 18, y, 10, true), text(`Peman: ${report.payouts.count} | ${dollars(report.payouts.amount)}`, 18, y - 16, 8), text(`Komisyon: ${dollars(report.tickets.commission)}`, 18, y - 29, 8), text(`Anile: ${report.accounting?.cancelledCount ?? 0} | ${dollars(report.accounting?.cancelledAmount)}`, 18, y - 42, 8), text(`Net: ${dollars(report.accounting?.netSales)}`, 18, y - 55, 8), text(`Defisi: ${dollars(report.accounting?.deficit)}`, 18, y - 68, 8));
    y -= 88;
  }
  if (rows.length) { out.push(text(rows[0], 18, y, 10, true)); y -= 18; for (const row of rows.slice(1)) { out.push(text(row, 22, y, 8)); y -= 14; } }
  out.push(text('LOTTIVEXA • Rapò lavant', 18, 16, 7));
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
  pages.forEach((commands, i) => { const content = 4 + i * 2; const normal = 3 + pages.length * 2; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 228 1000] /Resources << /Font << /F1 ${normal} 0 R /F2 ${normal + 1} 0 R >> >> /Contents ${content} 0 R >>`); objects.push(`<< /Length ${Buffer.byteLength(commands, 'latin1')} >>\nstream\n${commands}\nendstream`); });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const start = Buffer.byteLength(pdf, 'latin1'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
