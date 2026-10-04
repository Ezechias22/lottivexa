type ReportLine = { status?: string; count?: number; amount?: string };
type DrawLine = {
  drawNumber?: string;
  gameName?: string;
  gameCode?: string;
  drawDate?: Date | string | null;
  drawTime?: Date | string | null;
  session?: string;
  count?: number;
  amount?: string;
};
type SalesReport = {
  period: { from: Date | string; to: Date | string };
  tickets: { count: number; sales: string; commission: string };
  payouts: { count: number; amount: string };
  commission: string;
  accounting?: {
    cancelledCount?: number;
    cancelledAmount?: string;
    netSales?: string;
    deficit?: string;
  };
  byStatus: ReportLine[];
  byDay?: Array<{ day: string; count: number; amount: string }>;
  byGame?: Array<{ gameName: string; gameCode?: string; count: number; amount: string }>;
  byBranch?: Array<{ branchName: string; branchCode?: string; count: number; amount: string }>;
  byDraw?: DrawLine[];
  biggestWins?: Array<{
    ticketNumber: string;
    merchantName: string;
    gameName: string;
    drawNumber: string;
    amount: string;
  }>;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TIME_ZONE = 'America/Port-au-Prince';
const COLORS = {
  navy: '#112542',
  blue: '#2D6BE8',
  teal: '#21A78A',
  ink: '#20304A',
  muted: '#71819A',
  line: '#E4EAF2',
  pale: '#F3F6FB',
  white: '#FFFFFF',
  green: '#16845F',
  red: '#B84A55',
  amber: '#A8771F',
};

type PdfPage = { commands: string[]; y: number };

function rgb(hex: string) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
}

function pdfSafe(value: unknown) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2022/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\u202f/g, ' ')
    .replace(/[^\x20-\xff]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function text(
  value: unknown,
  x: number,
  y: number,
  size = 9,
  color = COLORS.ink,
  bold = false,
  align: 'left' | 'right' = 'left',
) {
  const plain = String(value ?? '').replace(/[\r\n\t]+/g, ' ');
  const width = plain.length * size * (bold ? 0.54 : 0.5);
  const left = align === 'right' ? x - width : x;
  const [r, g, b] = rgb(color);
  return r.toFixed(3) + ' ' + g.toFixed(3) + ' ' + b.toFixed(3) +
    ' rg BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf 1 0 0 1 ' +
    left.toFixed(2) + ' ' + y.toFixed(2) + ' Tm (' + pdfSafe(value) + ') Tj ET';
}

function rect(x: number, y: number, width: number, height: number, color: string) {
  const [r, g, b] = rgb(color);
  return 'q ' + r.toFixed(3) + ' ' + g.toFixed(3) + ' ' + b.toFixed(3) +
    ' rg ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + width.toFixed(2) +
    ' ' + height.toFixed(2) + ' re f Q';
}

function roundRect(x: number, y: number, width: number, height: number, radius: number, color: string, stroke?: string) {
  const r = Math.min(radius, width / 2, height / 2);
  const k = 0.5522847498 * r;
  const [red, green, blue] = rgb(color);
  const path = [
    (x + r) + ' ' + y + ' m',
    (x + width - r) + ' ' + y + ' l',
    (x + width - r + k) + ' ' + y + ' ' + (x + width) + ' ' + (y + r - k) + ' ' + (x + width) + ' ' + (y + r) + ' c',
    (x + width) + ' ' + (y + height - r) + ' l',
    (x + width) + ' ' + (y + height - r + k) + ' ' + (x + width - r + k) + ' ' + (y + height) + ' ' + (x + width - r) + ' ' + (y + height) + ' c',
    (x + r) + ' ' + (y + height) + ' l',
    (x + r - k) + ' ' + (y + height) + ' ' + x + ' ' + (y + height - r + k) + ' ' + x + ' ' + (y + height - r) + ' c',
    x + ' ' + (y + r) + ' l',
    x + ' ' + (y + r - k) + ' ' + (x + r - k) + ' ' + y + ' ' + (x + r) + ' ' + y + ' c',
    'h',
  ].join(' ');
  if (!stroke) return 'q ' + red + ' ' + green + ' ' + blue + ' rg ' + path + ' f Q';
  const [sr, sg, sb] = rgb(stroke);
  return 'q ' + red + ' ' + green + ' ' + blue + ' rg ' + sr + ' ' + sg + ' ' + sb +
    ' RG 0.7 w ' + path + ' B Q';
}

function line(x1: number, y1: number, x2: number, y2: number, color = COLORS.line, width = 0.7) {
  const [r, g, b] = rgb(color);
  return 'q ' + r + ' ' + g + ' ' + b + ' RG ' + width + ' w ' +
    x1 + ' ' + y1 + ' m ' + x2 + ' ' + y2 + ' l S Q';
}

function safeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('fr-HT', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(safeDate(value)).replace(/\./g, '');
}

function formatDay(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00.000Z') : safeDate(value);
  return formatDate(date);
}

function formatGeneratedAt() {
  return new Intl.DateTimeFormat('fr-HT', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date()).replace(/\./g, '');
}

function amount(value: unknown, currency: string) {
  const number = Number(value ?? 0);
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  return new Intl.NumberFormat('fr-HT', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
  }).format(Number.isFinite(number) ? number : 0);
}

function drawTimeLabel(row: DrawLine) {
  const encodedTime = row.drawNumber?.match(/(?:^|[-_])(\d{4})$/)?.[1];
  if (encodedTime) {
    const hour = Number(encodedTime.slice(0, 2));
    const minute = Number(encodedTime.slice(2));
    if (hour < 24 && minute < 60) return `${encodedTime.slice(0, 2)}:${encodedTime.slice(2)}`;
  }
  if (!row.drawTime) return '';
  const date = safeDate(row.drawTime);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function drawDateLabel(row: DrawLine) {
  const encodedDate = row.drawNumber?.match(/(?:^|[-_])(\d{8})[-_](\d{4})$/)?.[1];
  if (encodedDate) {
    const year = encodedDate.slice(0, 4), month = encodedDate.slice(4, 6), day = encodedDate.slice(6, 8);
    return formatDay(`${year}-${month}-${day}`);
  }
  return row.drawDate ? formatDate(row.drawDate) : '—';
}

function count(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('fr-HT', { maximumFractionDigits: 0 }).format(
    Number.isFinite(number) ? number : 0,
  );
}

function statusName(value?: string) {
  const labels: Record<string, string> = {
    VALID: 'Valab',
    WINNER: 'Gayan',
    WON: 'Gen gany',
    PAID: 'Peye',
    LOST: 'Pedi',
    PENDING: 'An atant',
    RESULT_PENDING: 'Rezilta an atant',
    CANCELLED: 'Anile',
    VOID: 'Anile',
  };
  return labels[String(value ?? '').toUpperCase()] ?? String(value ?? 'Lòt');
}

function sessionName(value?: string) {
  const labels: Record<string, string> = {
    MORNING: 'Maten',
    MIDDAY: 'Midi',
    EVENING: 'Aswè',
    NIGHT: 'Nwit',
    UNKNOWN: 'Lè pa disponib',
  };
  return labels[String(value ?? 'UNKNOWN').toUpperCase()] ?? 'Lè pa disponib';
}

function wrap(value: unknown, maxChars: number, maxLines = 3) {
  const words = String(value ?? '—').replace(/[\r\n\t]+/g, ' ').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words.length ? words : ['—']) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      let remaining = word;
      while (remaining.length > maxChars && lines.length < maxLines) {
        lines.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      if (remaining) current = remaining;
    } else if (!current) current = word;
    else if ((current + ' ' + word).length <= maxChars) current += ' ' + word;
    else {
      lines.push(current);
      current = word;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) return ['—'];
  const original = String(value ?? '—').replace(/[\r\n\t]+/g, ' ');
  if (lines.length === maxLines && original.length > lines.join(' ').length) {
    const last = lines.length - 1;
    lines[last] = lines[last].slice(0, Math.max(1, maxChars - 3)) + '...';
  }
  return lines;
}

export function buildSalesPdf(report: SalesReport, businessName: string, currency = 'USD') {
  const pages: PdfPage[] = [];
  // The page is replaced by beginPage(true) before rendering starts. Initializing
  // it here also keeps TypeScript's definite-assignment analysis aware that the
  // nested rendering helpers always have a PdfPage reference.
  let page: PdfPage = { commands: [], y: 0 };
  const period = formatDate(report.period.from) + ' - ' + formatDate(report.period.to);

  function beginPage(first = false) {
    page = { commands: [], y: 0 };
    pages.push(page);
    if (first) {
      page.commands.push(rect(0, PAGE_HEIGHT - 132, PAGE_WIDTH, 132, COLORS.navy));
      page.commands.push(rect(0, PAGE_HEIGHT - 134, PAGE_WIDTH, 3, COLORS.teal));
      page.commands.push(text('LOTTIVEXA  /  RAPÒ FINANSYE', MARGIN, PAGE_HEIGHT - 30, 8, '#B6C9E7', true));
      page.commands.push(text(String(businessName || 'Lottivexa').slice(0, 58), MARGIN, PAGE_HEIGHT - 57, 13, COLORS.white, true));
      page.commands.push(text('Rapò lavant', MARGIN, PAGE_HEIGHT - 89, 25, COLORS.white, true));
      page.commands.push(text('Peryòd: ' + period, MARGIN, PAGE_HEIGHT - 113, 9, '#D9E4F3'));
      page.commands.push(text('Kreye: ' + formatGeneratedAt(), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 113, 8, '#D9E4F3', false, 'right'));
      page.y = PAGE_HEIGHT - 158;
    } else {
      page.commands.push(rect(0, PAGE_HEIGHT - 77, PAGE_WIDTH, 77, COLORS.navy));
      page.commands.push(rect(0, PAGE_HEIGHT - 79, PAGE_WIDTH, 2.5, COLORS.teal));
      page.commands.push(text(String(businessName || 'Lottivexa').slice(0, 54), MARGIN, PAGE_HEIGHT - 31, 12, COLORS.white, true));
      page.commands.push(text('Rapò lavant  |  ' + period, MARGIN, PAGE_HEIGHT - 52, 9, '#C9D7EB'));
      page.commands.push(text('LOTTIVEXA', PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 39, 8, '#B6C9E7', true, 'right'));
      page.y = PAGE_HEIGHT - 104;
    }
  }

  function sectionTitle(title: string) {
    if (page.y < 83) beginPage(false);
    page.commands.push(text(title.toUpperCase(), MARGIN, page.y, 10, COLORS.navy, true));
    page.commands.push(rect(MARGIN, page.y - 8, 28, 2, COLORS.teal));
    page.y -= 22;
  }

  function tableHeader(headers: string[], widths: number[]) {
    page.commands.push(roundRect(MARGIN, page.y - 25, CONTENT_WIDTH, 25, 5, COLORS.pale));
    let x = MARGIN + 9;
    headers.forEach((header, index) => {
      const align = index === headers.length - 1 ? 'right' : 'left';
      const drawX = align === 'right' ? x + widths[index] - 18 : x;
      page.commands.push(text(header, drawX, page.y - 16, 7.4, COLORS.muted, true, align));
      x += widths[index];
    });
    page.y -= 29;
  }

  function table(title: string, headers: string[], widths: number[], rows: Array<Array<unknown>>) {
    const normalizedRows = rows.length ? rows : [['Pa gen done pou peryòd sa a.', ...headers.slice(1).map(() => '')]];
    const projectedHeight = 22 + 29 + normalizedRows.reduce((total, row) => {
      const lines = headers.map((_, index) =>
        wrap(row[index] ?? '', Math.max(8, Math.floor((widths[index] - 16) / 4.2)), 3).length,
      );
      return total + Math.max(26, Math.max(1, ...lines) * 10 + 12);
    }, 0) + 14;
    if (normalizedRows.length <= 12 && page.y - projectedHeight < 57 && page.y < PAGE_HEIGHT - 200) {
      beginPage(false);
    }
    const startBlock = () => {
      if (page.y < 112) beginPage(false);
      sectionTitle(title);
      tableHeader(headers, widths);
    };
    startBlock();
    normalizedRows.forEach((row, rowIndex) => {
      const cells = headers.map((_, index) => row[index] ?? '');
      const wrapped = cells.map((cell, index) => wrap(cell, Math.max(8, Math.floor((widths[index] - 16) / 4.2)), 3));
      const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
      const height = Math.max(26, lineCount * 10 + 12);
      if (page.y - height < 57) {
        beginPage(false);
        sectionTitle(title + ' (kontinye)');
        tableHeader(headers, widths);
      }
      const bottom = page.y - height;
      page.commands.push(rect(MARGIN, bottom, CONTENT_WIDTH, height, rowIndex % 2 ? COLORS.white : '#FAFBFD'));
      page.commands.push(line(MARGIN, bottom, PAGE_WIDTH - MARGIN, bottom, COLORS.line, 0.55));
      let x = MARGIN + 9;
      wrapped.forEach((lines, index) => {
        const rightAligned = index === headers.length - 1;
        const valueX = rightAligned ? x + widths[index] - 18 : x;
        lines.forEach((lineValue, lineIndex) => {
          page.commands.push(text(lineValue, valueX, page.y - 15 - lineIndex * 10, 8.2, index === headers.length - 1 ? COLORS.ink : '#43536B', index === headers.length - 1, rightAligned ? 'right' : 'left'));
        });
        x += widths[index];
      });
      page.y = bottom;
    });
    page.y -= 14;
  }

  beginPage(true);
  const sales = Number(report.tickets.sales ?? 0);
  const payoutAmount = Number(report.payouts.amount ?? 0);
  const net = Number(report.accounting?.netSales ?? (sales - payoutAmount - Number(report.commission ?? 0)));
  const metrics = [
    ['VANT BRIT', amount(report.tickets.sales, currency), COLORS.blue],
    ['TIKÈ VANN', count(report.tickets.count), COLORS.navy],
    ['PEMAN', amount(report.payouts.amount, currency), COLORS.teal],
    ['KOMISYON', amount(report.commission, currency), COLORS.amber],
  ];
  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap * 3) / 4;
  metrics.forEach((metric, index) => {
    const x = MARGIN + index * (cardWidth + gap);
    const bottom = page.y - 68;
    page.commands.push(roundRect(x, bottom, cardWidth, 68, 9, COLORS.white, COLORS.line));
    page.commands.push(rect(x, bottom + 3, 3, 62, String(metric[2])));
    page.commands.push(text(metric[0], x + 12, bottom + 48, 7, COLORS.muted, true));
    page.commands.push(text(metric[1], x + 12, bottom + 25, String(metric[1]).length > 16 ? 9 : 11, COLORS.ink, true));
  });
  page.y -= 86;

  const deficit = Number(report.accounting?.deficit ?? Math.max(0, payoutAmount + Number(report.commission ?? 0) - sales));
  table('Rezime finansye', ['Endikatè', 'Kantite'], [
    Math.round(CONTENT_WIDTH * 0.61),
    CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.61),
  ], [
    ['Peman gayan', count(report.payouts.count) + '  |  ' + amount(report.payouts.amount, currency)],
    ['Komisyon tikè / trete', amount(report.tickets.commission, currency) + '  /  ' + amount(report.commission, currency)],
    ['Vant nèt apre peman ak komisyon', amount(net, currency)],
    ['Defisi', amount(deficit, currency)],
    ['Tikè anile', count(report.accounting?.cancelledCount) + '  |  ' + amount(report.accounting?.cancelledAmount, currency)],
  ]);
  table('Rezime pa estati', ['Estati', 'Tikè', 'Montan tikè'], [245, 82, CONTENT_WIDTH - 327],
    (report.byStatus ?? []).map((row) => [statusName(row.status), count(row.count), amount(row.amount, currency)]));
  table('Vant pa jou', ['Dat', 'Tikè', 'Vant'], [255, 82, CONTENT_WIDTH - 337],
    (report.byDay ?? []).map((row) => [formatDay(row.day), count(row.count), amount(row.amount, currency)]));
  table('Vant pa lotri', ['Lotri', 'Tikè', 'Vant'], [255, 82, CONTENT_WIDTH - 337],
    (report.byGame ?? []).map((row) => [
      (row.gameCode ? row.gameCode + '  ' : '') + row.gameName,
      count(row.count),
      amount(row.amount, currency),
    ]));
  table('Vant pa biwo', ['Biwo', 'Tikè', 'Vant'], [255, 82, CONTENT_WIDTH - 337],
    (report.byBranch ?? []).map((row) => [
      (row.branchCode ? row.branchCode + '  ' : '') + row.branchName,
      count(row.count),
      amount(row.amount, currency),
    ]));
  table('Vant pa tiraj', ['Dat / sesyon', 'Lotri ak tiraj', 'Tikè', 'Vant'], [108, 190, 55, CONTENT_WIDTH - 353],
    (report.byDraw ?? []).map((row) => [
      drawDateLabel(row) + ' / ' + sessionName(row.session) + (drawTimeLabel(row) ? ' ' + drawTimeLabel(row) : ''),
      (row.gameCode ? row.gameCode + '  ' : '') + (row.gameName ?? '') + (row.drawNumber ? ' / ' + row.drawNumber : ''),
      count(row.count),
      amount(row.amount, currency),
    ]));
  table('Pi gwo tikè gayan yo', ['Tikè', 'Lotri / tiraj', 'Machann', 'Gany'], [85, 168, 135, CONTENT_WIDTH - 388],
    (report.biggestWins ?? []).map((row) => [
      row.ticketNumber,
      row.gameName + (row.drawNumber ? ' / ' + row.drawNumber : ''),
      row.merchantName,
      amount(row.amount, currency),
    ]));

  pages.forEach((item, index) => {
    item.commands.push(line(MARGIN, 45, PAGE_WIDTH - MARGIN, 45, COLORS.line, 0.7));
    item.commands.push(text('Rapò tenant - Konfidansyèl', MARGIN, 29, 7, COLORS.muted));
    item.commands.push(text('Paj ' + (index + 1) + ' / ' + pages.length, PAGE_WIDTH - MARGIN, 29, 7, COLORS.muted, false, 'right'));
  });

  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>'];
  objects.push('<< /Type /Pages /Kids [' + pages.map((_, index) => (3 + index * 2) + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>');
  pages.forEach((item, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const fontRegular = 3 + pages.length * 2;
    const fontBold = fontRegular + 1;
    const stream = item.commands.join('\n');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PAGE_WIDTH + ' ' + PAGE_HEIGHT +
      '] /Resources << /Font << /F1 ' + fontRegular + ' 0 R /F2 ' + fontBold + ' 0 R >> >> /Contents ' + contentObject + ' 0 R >>');
    objects.push('<< /Length ' + Buffer.byteLength(stream, 'latin1') + ' >>\nstream\n' + stream + '\nendstream');
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' +
    offsets.slice(1).map((offset) => String(offset).padStart(10, '0') + ' 00000 n ').join('\n') +
    '\ntrailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf, 'latin1');
}
