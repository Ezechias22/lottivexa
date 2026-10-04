import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { prisma, Prisma } from "@lottivexa/database";
import * as argon2 from "argon2";
import type { Principal } from "../common/guards/jwt-auth.guard";
import { merchantUpdate, MerchantUpdate } from "./merchant-update-policy";
import { reportRange } from "../reports/report-policy";
import { presentTicketLines } from "../tickets/ticket-line-flags";
import { merchantCommissionPercentage } from "./merchant-commission-policy";
import { setTenantCountryCurrency } from "../tenants/tenant-country-settings";
export const merchantPermissions = [
  "tickets.view",
  "tickets.create",
  "tickets.cancel",
  "tickets.reprint",
  "tickets.validate",
  "tickets.pay",
  "sales.view",
  "sales.create",
  "finance.view",
  "finance.close",
  "reports.view",
  "printers.view",
];
@Injectable()
export class MerchantsService {
  async me(u: Principal) {
    const tenantId = this.tenant(u),
      merchant = await prisma.merchantAccount.findFirst({
        where: { tenantId, userId: u.sub, status: "ACTIVE" },
        include: {
          branch: true,
          user: { select: { username: true, phone: true, email: true } },
          devices: true,
        },
      });
    if (!merchant) throw new ForbiddenException("MERCHANT_ACCOUNT_REQUIRED");
    return merchant;
  }
  async dashboard(u: Principal) {
    const merchant = await this.me(u),
      parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Port-au-Prince",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .formatToParts(new Date())
          .map((x) => [x.type, x.value]),
      ),
      businessDate = `${parts.year}-${parts.month}-${parts.day}`,
      range = reportRange(businessDate, businessDate);
    const [branding, tickets, payouts, session, recent, settings] =
      await Promise.all([
        prisma.tenantBranding.findUnique({
          where: { tenantId: merchant.tenantId },
          select: { businessName: true, logoUrl: true },
        }),
        prisma.ticket.aggregate({
          where: {
            tenantId: merchant.tenantId,
            merchantId: merchant.id,
            createdAt: range,
            status: { notIn: ["CANCELLED", "VOID"] },
          },
          _count: { _all: true },
          _sum: { amount: true, commission: true },
        }),
        prisma.payout.aggregate({
          where: {
            tenantId: merchant.tenantId,
            paidAt: range,
            ticket: { merchantId: merchant.id },
          },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        prisma.cashSession.findFirst({
          where: {
            tenantId: merchant.tenantId,
            merchantId: merchant.id,
            status: "OPEN",
          },
          include: { movements: true },
        }),
        prisma.ticket.findMany({
          where: { tenantId: merchant.tenantId, merchantId: merchant.id },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { winning: true, payout: true, draw: { include: { game: true } }, events: { select: { type: true, metadata: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }, lines: { select: { id: true, isWinner: true } }, ticketDraws: { include: { draw: { include: { game: true } } } } },
        }),
        prisma.tenantSetting.findUnique({
          where: { tenantId: merchant.tenantId },
          select: { currency: true },
        }),
      ]);
    return {
      businessDate,
      businessName: branding?.businessName ?? "Bolet",
      logoUrl: branding?.logoUrl ?? null,
      currency: settings?.currency ?? "USD",
      merchant: {
        id: merchant.id,
        displayName: merchant.displayName,
        merchantNumber: merchant.merchantNumber,
        branch: merchant.branch,
        devices: merchant.devices,
      },
      sales: tickets._sum.amount?.toString() ?? "0",
      commission: tickets._sum.commission?.toString() ?? "0",
      ticketCount: tickets._count._all,
      payouts: payouts._sum.amount?.toString() ?? "0",
      payoutCount: payouts._count._all,
      session,
      recent: recent.map(presentTicketLines),
    };
  }
  async list(u: Principal) {
    const tenantId = this.tenant(u);
    const now = new Date();
    const [merchants, commissionRules, tenant, tenantSetting] = await Promise.all([
      prisma.merchantAccount.findMany({
        where: { tenantId, archivedAt: null },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              status: true,
              forcePasswordChange: true,
            },
          },
          branch: { select: { id: true, code: true, name: true, settings: true } },
        },
        orderBy: { displayName: "asc" },
      }),
      prisma.commissionRule.findMany({
        where: {
          tenantId,
          scope: "MERCHANT",
          scopeId: { not: null },
          active: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
      }),
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } }),
      prisma.tenantSetting.findUnique({ where: { tenantId }, select: { currency: true } }),
    ]);
    const commissionByMerchant = new Map<string, string>();
    for (const rule of commissionRules) {
      if (rule.scopeId && !commissionByMerchant.has(rule.scopeId)) {
        commissionByMerchant.set(
          rule.scopeId,
          `${rule.percentage?.toString() ?? "0"}%`,
        );
      }
    }
    return merchants.map((merchant) => ({
      ...merchant,
      commissionRate: commissionByMerchant.get(merchant.id) ?? null,
      countryCode: tenant.jurisdictionCode,
      currency: tenantSetting?.currency ?? "USD",
    }));
  }
  async create(
    u: Principal,
    dto: {
      displayName: string;
      merchantNumber: string;
      username: string;
      email?: string;
      phone?: string;
      commissionPercentage: string;
      countryCode?: string;
      temporaryPassword: string;
      branchId: string;
    },
  ) {
    const commissionPercentage = merchantCommissionPercentage(dto.commissionPercentage);
    const tenantId = this.tenant(u),
      branch = await prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          tenantId,
          status: "ACTIVE",
          archivedAt: null,
        },
      });
    if (!branch) throw new BadRequestException("INVALID_BRANCH");
    await this.limit(tenantId);
    const hash = await argon2.hash(dto.temporaryPassword, {
      type: argon2.argon2id,
    });
    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } });
      await setTenantCountryCurrency(tx, tenantId, dto.countryCode ?? tenant.jurisdictionCode ?? "HT");
      let role = await tx.role.findFirst({
        where: { tenantId, code: "MERCHANT" },
      });
      if (!role)
        role = await tx.role.create({
          data: {
            tenantId,
            code: "MERCHANT",
            name: "Merchant",
            isSystem: true,
          },
        });
      const permissions = await tx.permission.findMany({
        where: { code: { in: merchantPermissions } },
      });
      await tx.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role!.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      });
      const user = await tx.user.create({
        data: {
          tenantId,
          username: dto.username,
          email: dto.email || null,
          phone: dto.phone || null,
          passwordHash: hash,
          status: "ACTIVE",
          forcePasswordChange: true,
          roles: { create: { roleId: role.id } },
        },
      });
      const merchant = await tx.merchantAccount.create({
        data: {
          tenantId,
          userId: user.id,
          branchId: branch.id,
          displayName: dto.displayName,
          merchantNumber: dto.merchantNumber,
          status: "ACTIVE",
        },
      });
      await tx.commissionRule.create({
        data: {
          tenantId,
          scope: "MERCHANT",
          scopeId: merchant.id,
          kind: "PERCENTAGE",
          percentage: new Prisma.Decimal(commissionPercentage),
          priority: 1000,
          startsAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: u.sub,
          action: "USER_CREATE",
          entityType: "MerchantAccount",
          entityId: merchant.id,
          newValues: {
            username: dto.username,
            branchId: branch.id,
            merchantNumber: dto.merchantNumber,
            commissionPercentage,
            countryCode: dto.countryCode ?? tenant.jurisdictionCode ?? "HT",
          },
        },
      });
      return {
        id: merchant.id,
        userId: user.id,
        username: user.username,
        commissionPercentage,
        temporaryPasswordRequired: true,
      };
    });
  }
  async update(u: Principal, id: string, input: MerchantUpdate) {
    const tenantId = this.tenant(u),
      dto = merchantUpdate(input),
      current = await prisma.merchantAccount.findFirst({
        where: { id, tenantId, archivedAt: null },
        include: { user: true },
      });
    if (!current) throw new ForbiddenException("RESOURCE_NOT_FOUND");
    const branchId = dto.branchId ?? current.branchId;
    if (
      dto.branchId &&
      !(await prisma.branch.findFirst({
        where: { id: branchId, tenantId, status: "ACTIVE", archivedAt: null },
      }))
    )
      throw new BadRequestException("INVALID_BRANCH");
    const loginChanged =
      dto.username !== undefined ||
      dto.email !== undefined ||
      dto.phone !== undefined;
    const commissionPercentage = dto.commissionPercentage === undefined
      ? undefined
      : merchantCommissionPercentage(dto.commissionPercentage);
    const [tenant, currentRule] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } }),
      prisma.commissionRule.findFirst({
        where: { tenantId, scope: "MERCHANT", scopeId: id, active: true, startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
      }),
    ]);
    await prisma.$transaction(async (tx) => {
      if (dto.countryCode) await setTenantCountryCurrency(tx, tenantId, dto.countryCode);
      await tx.merchantAccount.update({
        where: { id },
        data: { displayName: dto.displayName, branchId },
      });
      if (branchId !== current.branchId)
        await tx.device.updateMany({
          where: { tenantId, merchantId: id },
          data: { branchId },
        });
      if (loginChanged) {
        await tx.user.update({
          where: { id: current.userId },
          data: {
            username: dto.username,
            email: dto.email === undefined ? undefined : dto.email || null,
            phone: dto.phone === undefined ? undefined : dto.phone || null,
            tokenVersion: { increment: 1 },
          },
        });
        await tx.refreshToken.updateMany({
          where: { userId: current.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      if (commissionPercentage !== undefined) {
        const now = new Date();
        await tx.commissionRule.updateMany({
          where: { tenantId, scope: "MERCHANT", scopeId: id, active: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          data: { active: false, endsAt: now },
        });
        await tx.commissionRule.create({
          data: { tenantId, scope: "MERCHANT", scopeId: id, kind: "PERCENTAGE", percentage: new Prisma.Decimal(commissionPercentage), priority: 1000, startsAt: now },
        });
      }
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: u.sub,
          action: "UPDATE",
          entityType: "MerchantAccount",
          entityId: id,
          oldValues: {
            displayName: current.displayName,
            branchId: current.branchId,
            username: current.user.username,
            email: current.user.email,
            phone: current.user.phone,
            commissionPercentage: currentRule?.percentage?.toString() ?? null,
            countryCode: tenant.jurisdictionCode,
          } as Prisma.InputJsonValue,
          newValues: { ...dto, branchId, commissionPercentage: commissionPercentage ?? currentRule?.percentage?.toString() ?? null } as Prisma.InputJsonValue,
        },
      });
    });
    const [updated, savedTenant, savedSetting, savedRule] = await Promise.all([
      prisma.merchantAccount.findFirstOrThrow({
      where: { id, tenantId },
      include: {
        user: {
          select: { username: true, email: true, phone: true, status: true },
        },
        branch: true,
      },
      }),
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { jurisdictionCode: true } }),
      prisma.tenantSetting.findUnique({ where: { tenantId }, select: { currency: true } }),
      prisma.commissionRule.findFirst({ where: { tenantId, scope: "MERCHANT", scopeId: id, active: true }, orderBy: [{ priority: "desc" }, { startsAt: "desc" }] }),
    ]);
    return { ...updated, countryCode: savedTenant.jurisdictionCode, currency: savedSetting?.currency ?? "USD", commissionRate: savedRule?.percentage ? `${savedRule.percentage.toString()}%` : null };
  }
  async disable(u: Principal, id: string) {
    const tenantId = this.tenant(u),
      merchant = await prisma.merchantAccount.findFirst({
        where: { id, tenantId },
      });
    if (!merchant) throw new ForbiddenException("RESOURCE_NOT_FOUND");
    await prisma.$transaction([
      prisma.merchantAccount.update({
        where: { id },
        data: { status: "DISABLED" },
      }),
      prisma.user.update({
        where: { id: merchant.userId },
        data: { status: "DISABLED", tokenVersion: { increment: 1 } },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: merchant.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: u.sub,
          action: "USER_DISABLE",
          entityType: "MerchantAccount",
          entityId: id,
        },
      }),
    ]);
    return { disabled: true };
  }
  async reactivate(u: Principal, id: string) {
    const tenantId = this.tenant(u),
      merchant = await prisma.merchantAccount.findFirst({
        where: { id, tenantId, archivedAt: null },
      });
    if (!merchant) throw new ForbiddenException("RESOURCE_NOT_FOUND");
    await prisma.$transaction([
      prisma.merchantAccount.update({ where: { id }, data: { status: "ACTIVE" } }),
      prisma.user.update({
        where: { id: merchant.userId },
        data: { status: "ACTIVE", tokenVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: u.sub,
          action: "USER_REACTIVATE",
          entityType: "MerchantAccount",
          entityId: id,
        },
      }),
    ]);
    return { reactivated: true };
  }
  private async limit(tenantId: string) {
    const now = new Date(),
      sub = await prisma.subscription.findFirstOrThrow({
        where: {
          tenantId,
          OR: [
            {
              status: { in: ["ACTIVE", "TRIAL"] },
              currentPeriodEndsAt: { gt: now },
            },
            { status: "PAST_DUE", graceEndsAt: { gt: now } },
          ],
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      });
    if (
      sub.plan.maxMerchants !== null &&
      (await prisma.merchantAccount.count({
        where: { tenantId, archivedAt: null },
      })) >= sub.plan.maxMerchants
    )
      throw new ForbiddenException("LIMIT_REACHED");
  }
  private tenant(u: Principal) {
    if (!u.tenantId) throw new ForbiddenException("TENANT_ACCESS_REQUIRED");
    return u.tenantId;
  }
}
