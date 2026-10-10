export function localResultDate(value = new Date()) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function publishedResultsForDate(rows: Record<string, any>[], date: string) {
  return rows.filter(row => {
    const drawDate = typeof row.drawDate === 'string' ? row.drawDate.slice(0, 10) : '';
    return row.status !== 'CANCELLED' && (drawDate || String(row.publishedAt ?? '').slice(0, 10)) === date;
  }).sort((left, right) => {
    const timestamp = (row: Record<string, any>) => {
      for (const field of ['resultAt', 'closesAt', 'opensAt', 'drawDate', 'publishedAt']) {
        const value = row[field];
        if (typeof value === 'string') {
          const parsed = Date.parse(value);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
      return Number.POSITIVE_INFINITY;
    };
    return timestamp(left) - timestamp(right);
  });
}

export function orderedThreeDigitResult(keys: string[]) {
  if (keys.length !== 4 || !/^\d{3}$/.test(keys[3])) return null;
  const positions = keys.slice(0, 3);
  if (positions.some(key => !/^\d{2}$/.test(key))) return null;
  const combined = positions.map(key => key.replace(/^0+/, '') || '0').join('');
  return combined === keys[3] ? { positions, combined: keys[3] } : null;
}
