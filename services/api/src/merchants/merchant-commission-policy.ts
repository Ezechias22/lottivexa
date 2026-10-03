import { BadRequestException } from "@nestjs/common";

export function merchantCommissionPercentage(value: string): string {
  const percentage = Number(value);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new BadRequestException("INVALID_COMMISSION_PERCENTAGE");
  }
  return value;
}
