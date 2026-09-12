import{describe,expect,it}from'vitest';
import{merchantPermissions}from'./merchants.service';
describe('merchant default permissions',()=>{it('connects cash and report read workflows without granting adjustments',()=>{expect(merchantPermissions).toContain('finance.view');expect(merchantPermissions).toContain('finance.close');expect(merchantPermissions).toContain('reports.view');expect(merchantPermissions).not.toContain('finance.adjust')})});
