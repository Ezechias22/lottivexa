import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PUBLIC_KEY } from '../decorators/access.decorators';
import { prisma } from '@lottivexa/database';
export type Principal={sub:string;tenantId:string|null;permissions:string[];platform:boolean;tokenVersion:number};
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector:Reflector,private jwt:JwtService){}
  async canActivate(ctx:ExecutionContext){
    if(this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY,[ctx.getHandler(),ctx.getClass()])) return true;
    const req=ctx.switchToHttp().getRequest<{headers:{authorization?:string};url:string;user?:Principal}>();
    const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if(!token) throw new UnauthorizedException('AUTHENTICATION_REQUIRED');
    try { const principal=await this.jwt.verifyAsync<Principal>(token,{secret:process.env.JWT_ACCESS_SECRET}); const account=await prisma.user.findUnique({where:{id:principal.sub},select:{status:true,tokenVersion:true,tenantId:true,forcePasswordChange:true}}); if(!account||account.status!=='ACTIVE'||account.tokenVersion!==principal.tokenVersion||account.tenantId!==principal.tenantId) throw new Error('revoked'); if(account.forcePasswordChange&&!req.url.includes('/users/me/change-password')) throw new UnauthorizedException('PASSWORD_CHANGE_REQUIRED'); req.user=principal; return true; }
    catch(error) { if(error instanceof UnauthorizedException) throw error; throw new UnauthorizedException('INVALID_TOKEN'); }
  }
}
