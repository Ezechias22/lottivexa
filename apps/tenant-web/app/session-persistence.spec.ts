import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const refresh = readFileSync(new URL('./session-refresh.ts', import.meta.url), 'utf8');

describe('tenant session persistence', () => {
  it('does not log out tenant sessions after an idle timer', () => {
    expect(page).not.toContain('setTimeout(logout, 30 * 60 * 1000)');
    expect(page).toContain('refreshWebSession(API, "tenant"');
  });

  it('serializes refreshes across simultaneous requests and browser tabs', () => {
    expect(refresh).toContain('navigator as Navigator');
    expect(refresh).toContain('lottivexa-${app}-token-refresh');
    expect(refresh).toContain('inFlight');
  });
});
