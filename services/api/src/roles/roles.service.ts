import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@lottivexa/database';
import type { Principal } from '../common/guards/jwt-auth.guard';

const MANAGED_ROLES: Record<string, { name: string; permissions: string[] }> = {
  DIRECTOR: { name: 'Director', permissions: ['users.view','users.create','users.edit','users.disable','merchants.view','merchants.create','merchants.edit','merchants.disable','branches.view','branches.create','branches.edit','tickets.view','tickets.create','tickets.cancel','tickets.reprint','reports.view','reports.export','printers.view','printers.configure','devices.view'] },
  SUPERVISOR: { name: 'Supervisor', permissions: ['merchants.view','branches.view','tickets.view','tickets.create','tickets.cancel','tickets.reprint','reports.view','printers.view','devices.view'] },
  FINANCE: { name: 'Finance', permissions: ['finance.view','finance.deposit','finance.withdraw','finance.close','payments.view','payments.create','payments.refund','reports.view','reports.export','sales.view','tickets.view'] },
};

@Injectable()
export class RolesService {
  async list(u: Principal) {
    const tenantId = this.tenant(u);
    const all = await prisma.permission.findMany({ select: { id: true, code: true } });
    const ids = new Map(all.map((p) => [p.code, p.id]));
    await prisma.$transaction(async (tx) => {
      for (const [code, definition] of Object.entries(MANAGED_ROLES)) {
        const role = await tx.role.upsert({
          where: { tenantId_code: { tenantId, code } },
          create: { tenantId, code, name: definition.name },
          update: { name: definition.name },
          select: { id: true },
        });
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        const permissionIds = definition.permissions.map((p) => ids.get(p)).filter((p): p is string => Boolean(p));
        if (permissionIds.length) await tx.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })), skipDuplicates: true });
      }
    });
    return prisma.role.findMany({ where: { tenantId }, include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } });
  }

  async create(u: Principal, dto: { code: string; name: string; permissions: string[] }) {
    const tenantId = this.tenant(u);
    if (MANAGED_ROLES[dto.code]) throw new BadRequestException('MANAGED_ROLE_CANNOT_BE_CUSTOMIZED');
    const permissions = await prisma.permission.findMany({ where: { code: { in: dto.permissions } } });
    if (permissions.length !== new Set(dto.permissions).size) throw new BadRequestException('INVALID_PERMISSION');
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.create({ data: { tenantId, code: dto.code, name: dto.name, permissions: { create: permissions.map((p) => ({ permissionId: p.id })) } } });
      await tx.auditLog.create({ data: { tenantId, userId: u.sub, action: 'CREATE', entityType: 'Role', entityId: role.id, newValues: { code: dto.code, permissions: dto.permissions } } });
      return role;
    });
  }

  private tenant(u: Principal) { if (!u.tenantId) throw new ForbiddenException('TENANT_ACCESS_REQUIRED'); return u.tenantId; }
}
