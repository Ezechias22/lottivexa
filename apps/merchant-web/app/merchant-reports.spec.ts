import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./merchant-reports.tsx', import.meta.url), 'utf8');

describe('merchant report date filter', () => {
  it('keeps the initial default-range load independent from edited date fields', () => {
    expect(source).toContain('const load = useCallback(async (start: string, end: string) =>');
    expect(source).toContain('}, [request, t]);');
    expect(source).toContain('const initialLoadStarted = useRef(false)');
    expect(source).toContain('if (initialLoadStarted.current) return;');
    expect(source).toContain('void load(shiftDay(today, -6), today);');
    expect(source).toContain('void load(from, to)');
  });

  it('keeps the newest selected date range from being replaced by a slower older report request', () => {
    expect(source).toContain('const latestRequest = useRef(0)');
    expect(source).toContain('if (requestId === latestRequest.current) {');
    expect(source).toContain('if (requestId === latestRequest.current) setError');
  });
});
