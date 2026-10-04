import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@lottivexa/database';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { currencyForCountry } from '../tenants/country-currency-policy';

@Injectable()
export class SettingsService {
  async get(u: Principal) {
    const tenantId = this.tenant(u);
    const now = new Date();
    const [tenant, subscription] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { legalName: true, jurisdictionCode: true, settings: true, branding: true },
      }),
      prisma.subscription.findFirst({
        where: {
          tenantId,
          OR: [
            { status: { in: ['ACTIVE', 'TRIAL'] }, currentPeriodEndsAt: { gt: now } },
            { status: 'PAST_DUE', graceEndsAt: { gt: now } },
          ],
        },
        include: { plan: { include: { features: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { ...tenant, countryCode: tenant.jurisdictionCode, subscription };
  }

  async settings(u: Principal, dto: { countryCode: string; timezone: string; locale: string; dateFormat: string }) {
    const tenantId = this.tenant(u);
    const countryCode = dto.countryCode.trim().toUpperCase();
    const currency = currencyForCountry(countryCode);
    if (!currency) throw new BadRequestException('UNSUPPORTED_COUNTRY');

    const [tenant, old, ticketCount] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } }),
      prisma.tenantSetting.findUnique({ where: { tenantId } }),
      prisma.ticket.count({ where: { tenantId } }),
    ]);
    const countryChanged = Boolean(tenant.jurisdictionCode && tenant.jurisdictionCode !== countryCode);
    const currencyChanged = Boolean(old?.currency && old.currency !== currency);
    if (ticketCount > 0 && (countryChanged || currencyChanged || !old?.currency)) {
      throw new BadRequestException('TENANT_COUNTRY_LOCKED_AFTER_FIRST_TICKET');
    }

    return prisma.$transaction(async tx => {
      await tx.tenant.update({ where: { id: tenantId }, data: { jurisdictionCode: countryCode } });
      const value = await tx.tenantSetting.upsert({
        where: { tenantId },
        update: { currency, timezone: dto.timezone, locale: dto.locale, dateFormat: dto.dateFormat },
        create: { tenantId, currency, timezone: dto.timezone, locale: dto.locale, dateFormat: dto.dateFormat },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: u.sub,
          action: 'SETTINGS_CHANGE',
          entityType: 'TenantSetting',
          entityId: tenantId,
          oldValues: { countryCode: tenant.jurisdictionCode, currency: old?.currency ?? null, timezone: old?.timezone ?? null, locale: old?.locale ?? null, dateFormat: old?.dateFormat ?? null },
          newValues: { countryCode, currency, timezone: dto.timezone, locale: dto.locale, dateFormat: dto.dateFormat },
        },
      });
      return { ...value, countryCode };
    });
  }

  async branding(u: Principal, dto: { businessName: string; logoUrl?: string; faviconUrl?: string; primaryColor: string; secondaryColor: string }) {
    if (dto.logoUrl && (dto.logoUrl.length > 2800000 || (!dto.logoUrl.startsWith('https://') && !dto.logoUrl.startsWith('data:image/')))) {
      throw new BadRequestException('INVALID_LOGO');
    }
    const tenantId = this.tenant(u);
    const old = await prisma.tenantBranding.findUnique({ where: { tenantId } });
    const value = await prisma.tenantBranding.upsert({ where: { tenantId }, update: dto, create: { tenantId, ...dto } });
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: u.sub,
        action: 'SETTINGS_CHANGE',
        entityType: 'TenantBranding',
        entityId: tenantId,
        oldValues: old as unknown as Prisma.InputJsonValue,
        newValues: value as unknown as Prisma.InputJsonValue,
      },
    });
    return value;
  }

  private tenant(u: Principal) {
    if (!u.tenantId) throw new ForbiddenException('TENANT_ACCESS_REQUIRED');
    return u.tenantId;
  }
}
