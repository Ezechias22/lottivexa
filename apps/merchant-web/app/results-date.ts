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

function scheduledTime(row: Record<string, any>) {
  for (const field of ['resultAt', 'closesAt', 'opensAt', 'drawDate', 'publishedAt']) {
    const value = row[field];
    if (typeof value === 'string') {
      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) return timestamp;
    }
  }
  return Number.POSITIVE_INFINITY;
}

export function publishedResultsForDate(rows: Record<string, any>[], date: string) {
  return rows
    .filter(row => row.status === 'RESULT_PUBLISHED' && drawResultDate(row) === date)
    .sort((left, right) => scheduledTime(left) - scheduledTime(right));
}

export function orderedThreeDigitResult(keys: string[]) {
  if (keys.length !== 4 || !/^\d{3}$/.test(keys[3])) return null;
  const positions = keys.slice(0, 3);
  if (positions.some(key => !/^\d{2}$/.test(key))) return null;
  const combined = positions.map(key => key.replace(/^0+/, '') || '0').join('');
  return combined === keys[3] ? { positions, combined: keys[3] } : null;
}
