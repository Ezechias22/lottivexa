export function localResultDate(value = new Date()) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function publishedResultsForDate(rows: Record<string, any>[], date: string) {
  return rows.filter(row => {
    const drawDate = typeof row.drawDate === 'string' ? row.drawDate.slice(0, 10) : '';
    return row.status !== 'CANCELLED' && (drawDate || String(row.publishedAt ?? '').slice(0, 10)) === date;
  });
}
