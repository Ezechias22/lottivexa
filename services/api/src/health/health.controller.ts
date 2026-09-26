import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { prisma } from "@lottivexa/database";
import { IS_PUBLIC } from "../common/decorators/access.decorators";
import { redisReady } from "./redis-health";
@Controller()
export class HealthController {
  @IS_PUBLIC() @Get("health") health() {
    return {
      status: "ok",
      service: "lottivexa-api",
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
  @IS_PUBLIC() @Get("ready") async ready() {
    const checks = { database: false, redis: false };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {}
    const redisRequired = process.env.REDIS_REQUIRED === "true";
    checks.redis = redisRequired ? await redisReady() : true;
    if (!checks.database || (redisRequired && !checks.redis))
      throw new ServiceUnavailableException("DEPENDENCY_NOT_READY");
    return { status: "ready", checks };
  }
}
