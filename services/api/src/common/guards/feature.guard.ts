import{CanActivate,ExecutionContext,ForbiddenException,Injectable}from'@nestjs/common';
import{Reflector}from'@nestjs/core';
import{prisma}from'@lottivexa/database';
import{FEATURE_KEY,PUBLIC_KEY}from'../decorators/access.decorators';
import type{Principal}from'./jwt-auth.guard';
@Injectable()export class FeatureGuard implements CanActivate{constructor(private reflector:Reflector){}async canActivate(ctx:ExecutionContext){if(this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY,[ctx.getHandler(),ctx.getClass()]))return true;const feature=this.reflector.getAllAndOverride<string>(FEATURE_KEY,[ctx.getHandler(),ctx.getClass()]);if(!feature)return true;const user=ctx.switchToHttp().getRequest<{user?:Principal}>().user;if(!user||user.platform||!user.tenantId)return true;const now=new Date(),enabled=await prisma.subscription.findFirst({where:{tenantId:user.tenantId,OR:[{status:{in:['ACTIVE','TRIAL']},currentPeriodEndsAt:{gt:now}},{status:'PAST_DUE',graceEndsAt:{gt:now}}],plan:{features:{some:{key:feature,enabled:true}}}},select:{id:true}});if(!enabled)throw new ForbiddenException('FEATURE_NOT_AVAILABLE');return true}}
