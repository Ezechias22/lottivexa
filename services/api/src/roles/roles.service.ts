import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@lottivexa/database';
import type { Principal } from '../common/guards/jwt-auth.guard';

const DEFAULT_ROLES: Record<string, { name: string; permissions: string[] }> = {
  DIRECTOR: { name: 'Director', permissions: ['users.view','users.create','users.edit','users.disable','merchants.view','merchants.create','merchants.edit','merchants.disable','branches.view','branches.create','branches.edit','tickets.view','tickets.create','tickets.cancel','tickets.reprint','reports.view','reports.export','printers.view','printers.configure','devices.view'] },
  SUPERVISOR: { name: 'Supervisor', permissions: ['merchants.view','branches.view','tickets.view','tickets.create','tickets.cancel','tickets.reprint','reports.view','printers.view','devices.view'] },
  FINANCE: { name: 'Finance', permissions: ['finance.view','finance.adjust','finance.close','finance.deposit','finance.withdraw','payments.view','payments.create','payments.refund','reports.view','reports.export','sales.view','tickets.view'] },
};

@Injectable()
export class RolesService {
  async list(u: Principal) {
    const tenantId = this.tenant(u);
    const allPermissions = await prisma.permission.findMany();
    const byCode = new Map(allPermissions.map((p: any) => [p.code, p.id]));
    const existing = await prisma.role.findMany({ where: { tenantId }, select: { id: true, code: true } });
    await prisma.$transaction(async (tx: any) => {
      for (const [code, definition] of Object.entries(DEFAULT_ROLES)) {
        const role = existing.find((x: any) => x.code === code) ?? await tx.role.create({ data: { tenantId, code, name: definition.name, isSystem: true }, select: { id: true, code: true } });
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        await tx.rolePermission.createMany({ data: definition.permissions.filter(p => byCode.has(p)).map(p => ({ roleId: role!.id, permissionId: byCode.get(p)! })) });
      }
    });
    return prisma.role.findMany({ where: { tenantId }, include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } });
  }
  async create(u: Principal, dto: { code: string; name: string; permissions: string[] }) {
    const tenantId = this.tenant(u), permissions = await prisma.permission.findMany({ where: { code: { in: dto.permissions } } });
    if (permissions.length !== new Set(dto.permissions).size) throw new BadRequestException('INVALID_PERMISSION');
    return prisma.$transaction(async (tx: any) => {
      const role = await tx.role.create({ data: { tenantId, code: dto.code, name: dto.name, permissions: { create: permissions.map((p: any) => ({ permissionId: p.id })) } } });
      await tx.auditLog.create({ data: { tenantId, userId: u.sub, action: 'CREATE', entityType: 'Role', entityId: role.id, newValues: { code: dto.code, permissions: dto.permissions } } });
      return role;
    });
  }
  private tenant(u: Principal) { if (!u.tenantId) throw new ForbiddenException('TENANT_ACCESS_REQUIRED'); return u.tenantId; }
}
