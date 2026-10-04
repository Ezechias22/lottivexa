import { BadRequestException } from '@nestjs/common';

export type MerchantUpdate = {
  displayName?: string;
  username?: string;
  email?: string;
  phone?: string;
  branchId?: string;
  commissionPercentage?: string;
  countryCode?: string;
};

export function merchantUpdate(input: MerchantUpdate) {
  const clean = Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== undefined),
  ) as MerchantUpdate;
  if (!Object.keys(clean).length) throw new BadRequestException('EMPTY_UPDATE');
  if (clean.displayName === '') throw new BadRequestException('INVALID_MERCHANT_NAME');
  if (clean.username === '') throw new BadRequestException('INVALID_USERNAME');
  if (clean.countryCode) clean.countryCode = clean.countryCode.toUpperCase();
  return clean;
}
