import{describe,expect,it}from'vitest';import{BadRequestException}from'@nestjs/common';import{PlansService}from'./plans.service';
describe('PlansService',()=>{it('rejects unsupported feature keys before database access',()=>{expect(()=>new PlansService().setFeature('plan-id','invented_feature',{enabled:true})).toThrow(BadRequestException)})});
