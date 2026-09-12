import { describe, expect, it } from 'vitest';
import { jsonSafe } from './json-safe.interceptor';

describe('jsonSafe', () => {
  it('serializes nested bigint identifiers without changing dates', () => {
    const createdAt = new Date('2026-09-10T00:00:00Z');
    expect(jsonSafe({ id: 12n, events: [{ id: 14n }], createdAt })).toEqual({ id: '12', events: [{ id: '14' }], createdAt });
  });
});
