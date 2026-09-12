import { CanActivate,ExecutionContext,ForbiddenException,Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { prisma } from '@lottivexa/database';
import { PUBLIC_KEY } from '../decorators/access.decorators';
import { Principal } from './jwt-auth.guard';
@Injectable()
export class SubscriptionGuard implements CanActivate {
 constructor(private reflector:Reflector){}
 async canActivate(ctx:ExecutionContext){
  if(this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY,[ctx.getHandler(),ctx.getClass()])) return true;
  const user=ctx.switchToHttp().getRequest<{user?:Principal}>().user;
  if(!user||user.platform||!user.tenantId) return true;
  const now=new Date(); const active=await prisma.subscription.findFirst({where:{tenantId:user.tenantId,tenant:{status:'ACTIVE'},OR:[{status:{in:['TRIAL','ACTIVE']},currentPeriodEndsAt:{gt:now}},{status:'PAST_DUE',graceEndsAt:{gt:now}}]}});
  if(!active) throw new ForbiddenException('SUBSCRIPTION_EXPIRED'); return true;
 }
}
