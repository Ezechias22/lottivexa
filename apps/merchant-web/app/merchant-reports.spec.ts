import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./merchant-reports.tsx', import.meta.url), 'utf8');

describe('merchant report date filter', () => {
  it('keeps the initial default-range load independent from edited date fields', () => {
    expect(source).toContain('const load = useCallback(async (start: string, end: string) =>');
    expect(source).toContain('}, [request, t]);');
    expect(source).toContain('useEffect(() => { void load(shiftDay(today, -6), today); }, [load, today]);');
    expect(source).toContain('void load(from, to)');
  });
});
