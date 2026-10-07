import { BadRequestException } from '@nestjs/common';

function parseDrawDate(value?: string): Date | undefined {
  if (value === undefined || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('INVALID_DRAW_DATE');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('INVALID_DRAW_DATE');
  }
  return parsed;
}

export function drawDateFilter(from?: string, to?: string) {
  const start = parseDrawDate(from);
  const end = parseDrawDate(to);
  if (start && end && start > end) throw new BadRequestException('INVALID_DRAW_DATE_RANGE');
  if (!start && !end) return undefined;
  return { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
}
