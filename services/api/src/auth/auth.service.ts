import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { prisma } from "@lottivexa/database";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import type { Principal } from "../common/guards/jwt-auth.guard";
import {
  passwordResetExpiry,
  passwordResetHash,
  passwordResetUsable,
} from "./password-reset-policy";
@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}
  async login(input: {
    tenant: string;
    username: string;
    password: string;
    deviceId?: string;
  }) {
    const platform = input.tenant === "platform",
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: input.username },
            { email: input.username },
            { phone: input.username },
          ],
          deletedAt: null,
          ...(platform
            ? { tenantId: null }
            : { tenant: { slug: input.tenant } }),
        },
        include: {
          roles: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      });
    if (!user) throw new UnauthorizedException("INVALID_CREDENTIALS");
    if (user.status === "DISABLED")
      throw new UnauthorizedException("ACCOUNT_DISABLED_CONTACT_ADMIN");
    if (
      user.status !== "ACTIVE" ||
      !(await argon2.verify(user.passwordHash, input.password))
    )
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    const tokens = await this.issue(user, input.deviceId);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          deviceId: input.deviceId,
        },
      }),
    ]);
    return { ...tokens, forcePasswordChange: user.forcePasswordChange };
  }
  async refresh(raw: string) {
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(raw) },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: { permissions: { include: { permission: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (record?.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("REFRESH_TOKEN_REUSE_DETECTED");
    }
    if (
      !record ||
      record.expiresAt <= new Date() ||
      record.user.status !== "ACTIVE"
    )
      throw new UnauthorizedException("INVALID_REFRESH_TOKEN");
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count !== 1)
        throw new UnauthorizedException("REFRESH_TOKEN_REUSE_DETECTED");
      const rawNext = randomBytes(48).toString("base64url");
      await tx.refreshToken.create({
        data: {
          userId: record.userId,
          tokenHash: this.hash(rawNext),
          deviceId: record.deviceId,
          expiresAt: new Date(Date.now() + 7 * 864e5),
        },
      });
      return {
        accessToken: await this.access(record.user),
        refreshToken: rawNext,
      };
    });
  }
  async forgotPassword(input: { tenant: string; identifier: string }) {
    const platform = input.tenant === "platform",
      identifier = input.identifier.trim(),
      user = await prisma.user.findFirst({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          ...(platform
            ? { tenantId: null }
            : { tenant: { slug: input.tenant } }),
          OR: [
            { username: identifier },
            { email: identifier },
            { phone: identifier },
          ],
        },
      });
    if (user?.email) {
      const recent = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          createdAt: { gt: new Date(Date.now() - 120000) },
        },
        select: { id: true },
      });
      if (!recent) {
        const raw = randomBytes(48).toString("base64url"),
          resetUrl = `${process.env.PASSWORD_RESET_WEB_URL ?? "https://app.lottivexa.invalid/reset-password"}?token=${encodeURIComponent(raw)}`;
        await prisma.$transaction([
          prisma.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() },
          }),
          prisma.passwordResetToken.create({
            data: {
              userId: user.id,
              tokenHash: passwordResetHash(raw),
              expiresAt: passwordResetExpiry(),
            },
          }),
          prisma.notification.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              type: "PASSWORD_RESET",
              channel: "EMAIL",
              title: "Reset your Lottivexa password",
              body: `Use this secure link within 30 minutes: ${resetUrl}`,
              status: "PENDING",
            },
          }),
          prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              action: "UPDATE",
              entityType: "PasswordReset",
              entityId: user.id,
              newValues: { requested: true },
            },
          }),
        ]);
      }
    }
    return { accepted: true };
  }
  async resetPassword(input: { token: string; newPassword: string }) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: passwordResetHash(input.token) },
      include: { user: true },
    });
    if (
      !record ||
      !passwordResetUsable(record) ||
      record.user.status !== "ACTIVE"
    )
      throw new UnauthorizedException("INVALID_OR_EXPIRED_RESET_TOKEN");
    const passwordHash = await argon2.hash(input.newPassword, {
      type: argon2.argon2id,
    });
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1)
        throw new UnauthorizedException("INVALID_OR_EXPIRED_RESET_TOKEN");
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          forcePasswordChange: false,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          tenantId: record.user.tenantId,
          userId: record.userId,
          action: "UPDATE",
          entityType: "Password",
          entityId: record.userId,
          newValues: { reset: true },
        },
      });
    });
    return { changed: true, loginRequired: true };
  }
  sessions(u: Principal) {
    return prisma.refreshToken.findMany({
      where: { userId: u.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, deviceId: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  }
  async revoke(u: Principal, id: string) {
    const changed = await prisma.refreshToken.updateMany({
      where: { id, userId: u.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (changed.count !== 1) throw new ForbiddenException("RESOURCE_NOT_FOUND");
    return { revoked: true };
  }
  async logoutAll(u: Principal) {
    await prisma.$transaction([
      prisma.refreshToken.updateMany({
        where: { userId: u.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: u.sub },
        data: { tokenVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: u.tenantId,
          userId: u.sub,
          action: "LOGOUT",
          entityType: "User",
          entityId: u.sub,
        },
      }),
    ]);
    return { revoked: true };
  }
  private async issue(user: any, deviceId?: string) {
    const raw = randomBytes(48).toString("base64url");
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(raw),
        deviceId,
        expiresAt: new Date(Date.now() + 7 * 864e5),
      },
    });
    return { accessToken: await this.access(user), refreshToken: raw };
  }
  private access(user: any) {
    const permissions = [
      ...new Set<string>(
        user.roles.flatMap((x: any) =>
          x.role.permissions.map((p: any) => p.permission.code),
        ),
      ),
    ];
    return this.jwt.signAsync(
      {
        sub: user.id,
        tenantId: user.tenantId,
        permissions,
        platform: user.tenantId === null,
        tokenVersion: user.tokenVersion,
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: "15m" },
    );
  }
  private hash(v: string) {
    return createHash("sha256").update(v).digest("hex");
  }
}
