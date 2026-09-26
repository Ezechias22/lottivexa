type SalesReport = {
  period: { from: Date; to: Date };
  tickets: { count: number; sales: string; potentialWin: string; commission: string };
  payouts: { count: number; amount: string };
  commission: string;
  byStatus: { status: string; count: number; amount: string }[];
};

const safe = (value: unknown) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\xFF]/g, '?');

const pageChunks = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
};

/** Build a small, printer-friendly PDF without scaling long reports onto A4. */
export function buildSalesPdf(
  report: SalesReport,
  businessName: string,
  _currency: string,
) {
  const rows = [
    businessName,
    'RAPO LAVANT / RAPPORT DES VENTES',
    `Period: ${report.period.from.toISOString()} - ${report.period.to.toISOString()}`,
    'Currency: $',
    '',
    `Ticket count: ${report.tickets.count}`,
    `Gross sales: $ ${report.tickets.sales}`,
    `Potential winnings: $ ${report.tickets.potentialWin}`,
    `Ticket commissions: $ ${report.tickets.commission}`,
    `Payout count: ${report.payouts.count}`,
    `Payout amount: $ ${report.payouts.amount}`,
    `Processed commission: $ ${report.commission}`,
    '',
    'BY STATUS',
    ...report.byStatus.map(
      (row) => `${row.status}: ${row.count} ticket(s), $ ${row.amount}`,
    ),
    '',
    `Generated UTC: ${new Date().toISOString()}`,
  ];

  // Keep the report readable. Extra rows become extra PDF pages instead of
  // being pushed outside a fixed A4 page or shrunk to microscopic text.
  const pages = pageChunks(rows, 40);
  const pageObjectNumbers = pages.map((_, index) => 3 + index * 2);
  const contentObjectNumbers = pages.map((_, index) => 4 + index * 2);
  const fontObjectNumber = 3 + pages.length * 2;
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ];

  pages.forEach((pageRows, pageIndex) => {
    const commands = pageRows
      .map(
        (row, rowIndex) =>
          `BT /F1 ${rowIndex < 2 ? 16 : 10} Tf 42 ${790 - rowIndex * 19} Td (${safe(row)}) Tj ET`,
      )
      .join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumbers[pageIndex]} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(commands, 'latin1')} >>\nstream\n${commands}\nendstream`,
    );
  });

  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );

  let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, 'latin1'));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(output, 'latin1');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += `${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
    .join('\n')}\n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(output, 'latin1');
}
