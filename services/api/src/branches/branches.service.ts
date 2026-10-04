import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@lottivexa/database';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { officeCountryFromSettings, officeSettings, resolveOfficeCountry } from './office-location-policy';

type OfficeKind = 'OFFICE' | 'CENTRAL';
type BranchInput = {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  openingHours?: Record<string, unknown>;
  officeKind?: OfficeKind;
  countryCode?: string;
};

@Injectable()
export class BranchesService {
  async list(u: Principal) {
    const tenantId = this.tenant(u);
    const [branches, tenant, setting] = await Promise.all([
      prisma.branch.findMany({
        where: { tenantId, archivedAt: null },
        include: { _count: { select: { merchants: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } }),
      prisma.tenantSetting.findUnique({ where: { tenantId }, select: { currency: true } }),
    ]);
    return branches.map(branch => ({
      ...branch,
      officeKind: (branch.settings as { officeKind?: OfficeKind } | null)?.officeKind ?? 'OFFICE',
      countryCode: officeCountryFromSettings(branch.settings, tenant.jurisdictionCode),
      currency: setting?.currency ?? 'USD',
    }));
  }

  async create(u: Principal, dto: BranchInput) {
    const tenantId = this.tenant(u);
    await this.limit(tenantId);
    const branch = await prisma.$transaction(async tx => {
      const currentTenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } });
      const countryCode = resolveOfficeCountry(dto.countryCode, currentTenant.jurisdictionCode);
      const value = await tx.branch.create({
        data: {
          tenantId,
          code: dto.code,
          name: dto.name,
          address: dto.address,
          phone: dto.phone,
          openingHours: dto.openingHours as Prisma.InputJsonValue | undefined,
          settings: officeSettings(null, dto.officeKind ?? 'OFFICE', countryCode) as Prisma.InputJsonValue,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: u.sub,
          action: 'CREATE',
          entityType: 'Branch',
          entityId: value.id,
          newValues: { code: value.code, name: value.name, officeKind: dto.officeKind ?? 'OFFICE', countryCode },
        },
      });
      return value;
    });
    return {
      ...branch,
      officeKind: dto.officeKind ?? 'OFFICE',
      countryCode: officeCountryFromSettings(branch.settings, dto.countryCode),
    };
  }

  async update(u: Principal, id: string, dto: BranchInput) {
    const tenantId = this.tenant(u);
    const existing = await prisma.branch.findFirst({ where: { id, tenantId, archivedAt: null } });
    if (!existing) throw new ForbiddenException('RESOURCE_NOT_FOUND');
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } });
    const currentSettings = existing.settings as Record<string, unknown> | null;
    const countryCode = resolveOfficeCountry(
      dto.countryCode ?? currentSettings?.countryCode,
      tenant.jurisdictionCode,
    );
    await prisma.$transaction(async tx => {
      await tx.branch.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          address: dto.address,
          phone: dto.phone,
          openingHours: dto.openingHours as Prisma.InputJsonValue | undefined,
          settings: officeSettings(
            existing.settings,
            dto.officeKind ?? (existing.settings as { officeKind?: OfficeKind } | null)?.officeKind ?? 'OFFICE',
            countryCode,
          ) as Prisma.InputJsonValue,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: u.sub,
          action: 'UPDATE',
          entityType: 'Branch',
          entityId: id,
          oldValues: { code: existing.code, name: existing.name, settings: existing.settings ?? Prisma.JsonNull } as Prisma.InputJsonValue,
          newValues: { ...dto, officeKind: dto.officeKind ?? 'OFFICE', countryCode } as Prisma.InputJsonValue,
        },
      });
    });
    return { updated: true };
  }

  private async limit(tenantId: string) {
    const now = new Date();
    const sub = await prisma.subscription.findFirstOrThrow({
      where: {
        tenantId,
        OR: [
          { status: { in: ['ACTIVE', 'TRIAL'] }, currentPeriodEndsAt: { gt: now } },
          { status: 'PAST_DUE', graceEndsAt: { gt: now } },
        ],
      },
      include: { plan: { include: { features: { where: { key: 'multi_branch', enabled: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const count = await prisma.branch.count({ where: { tenantId, archivedAt: null } });
    if (count > 0 && !sub.plan.features.length) throw new ForbiddenException('FEATURE_NOT_AVAILABLE');
    if (sub.plan.maxBranches !== null && count >= sub.plan.maxBranches) throw new ForbiddenException('LIMIT_REACHED');
  }

  private tenant(u: Principal) {
    if (!u.tenantId) throw new ForbiddenException('TENANT_ACCESS_REQUIRED');
    return u.tenantId;
  }
}
