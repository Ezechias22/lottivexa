import { CanActivate,ExecutionContext,ForbiddenException,Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY,PLATFORM_ONLY_KEY } from '../decorators/access.decorators';
import { Principal } from './jwt-auth.guard';
@Injectable()
export class PermissionsGuard implements CanActivate {
 constructor(private reflector:Reflector){}
 canActivate(ctx:ExecutionContext){
  const req=ctx.switchToHttp().getRequest<{user?:Principal}>(); if(!req.user) return true;
  if(this.reflector.getAllAndOverride<boolean>(PLATFORM_ONLY_KEY,[ctx.getHandler(),ctx.getClass()])&&!req.user.platform) throw new ForbiddenException('PLATFORM_ACCESS_REQUIRED');
  const needed=this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY,[ctx.getHandler(),ctx.getClass()])??[];
  if(!needed.every(p=>req.user!.permissions.includes('*')||req.user!.permissions.includes(p))) throw new ForbiddenException('FORBIDDEN');
  return true;
 }
}
