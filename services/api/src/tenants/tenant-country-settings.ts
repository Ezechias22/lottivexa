import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@lottivexa/database';
import { currencyForCountry } from './country-currency-policy';

/** Keeps the tenant's operational currency consistent across every office and merchant. */
export async function setTenantCountryCurrency(
  tx: Prisma.TransactionClient,
  tenantId: string,
  value: string,
) {
  const countryCode = value.trim().toUpperCase();
  const currency = currencyForCountry(countryCode);
  if (!currency) throw new BadRequestException('UNSUPPORTED_COUNTRY');

  const [tenant, setting, ticketCount] = await Promise.all([
    tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } }),
    tx.tenantSetting.findUnique({ where: { tenantId }, select: { currency: true } }),
    tx.ticket.count({ where: { tenantId } }),
  ]);
  const changed = tenant.jurisdictionCode !== countryCode || setting?.currency !== currency;
  if (ticketCount > 0 && changed) {
    throw new BadRequestException('TENANT_COUNTRY_LOCKED_AFTER_FIRST_TICKET');
  }

  await tx.tenant.update({ where: { id: tenantId }, data: { jurisdictionCode: countryCode } });
  await tx.tenantSetting.upsert({
    where: { tenantId },
    update: { currency },
    create: { tenantId, currency },
  });
  return { countryCode, currency };
}
