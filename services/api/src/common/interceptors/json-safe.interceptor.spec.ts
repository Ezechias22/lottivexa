import { StreamableFile } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { jsonSafe } from './json-safe.interceptor';

describe('jsonSafe', () => {
  it('serializes nested bigint identifiers without changing dates', () => {
    const createdAt = new Date('2026-09-10T00:00:00Z');
    expect(jsonSafe({ id: 12n, events: [{ id: 14n }], createdAt })).toEqual({ id: '12', events: [{ id: '14' }], createdAt });
  });

  it('keeps StreamableFile instances intact for binary downloads', () => {
    const file = new StreamableFile(Buffer.from('%PDF-1.4'));
    expect(jsonSafe(file)).toBe(file);
  });
});
