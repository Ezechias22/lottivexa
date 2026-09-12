import{describe,expect,it}from'vitest';import{ForbiddenException}from'@nestjs/common';import{RolesService}from'./roles.service';
describe('RolesService tenant boundary',()=>{it('rejects a platform principal on tenant role routes',()=>{expect(()=>new RolesService().list({sub:'x',tenantId:null,permissions:['*'],platform:true,tokenVersion:0})).toThrow(ForbiddenException)})});
