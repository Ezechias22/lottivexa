export function localResultDate(value = new Date()) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function drawResultDate(row: Record<string, unknown>) {
  for (const field of ['drawDate', 'publishedAt']) {
    const value = row[field];
    if (typeof value === 'string') {
      const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
      if (match) return match[1];
    }
  }
  return '';
}

export function publishedResultsForDate(rows: Record<string, any>[], date: string) {
  return rows.filter(row => row.status === 'RESULT_PUBLISHED' && drawResultDate(row) === date);
}
