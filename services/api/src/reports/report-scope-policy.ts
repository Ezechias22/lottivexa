import { BadRequestException } from '@nestjs/common';

export function parseMerchantIds(value?: string | string[]): string[] | undefined {
  if (value === undefined || value === '') return undefined;
  const tokens = (Array.isArray(value) ? value : [value])
    .flatMap(item => item.split(','))
    .map(item => item.trim())
    .filter(Boolean);
  const ids = [...new Set(tokens)];
  if (!ids.length || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    throw new BadRequestException('INVALID_REPORT_FILTER');
  }
  return ids;
}
