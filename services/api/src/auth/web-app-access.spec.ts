import { describe, expect, it } from 'vitest';
import { webAppAccessError } from './web-app-access';

describe('web app account access', () => {
  it('keeps tenant owners in the tenant app and merchants in the merchant app', () => {
    expect(webAppAccessError('tenant-web', { tenantId: 't1' })).toBeNull();
    expect(webAppAccessError('merchant-web', { tenantId: 't1', merchantAccount: { status: 'ACTIVE' } })).toBeNull();
  });
  it('rejects tenant and merchant accounts from the other web app', () => {
    expect(webAppAccessError('tenant-web', { tenantId: 't1', merchantAccount: { status: 'ACTIVE' } })).toBe('MERCHANT_ACCOUNT_CANNOT_LOGIN_TENANT_APP');
    expect(webAppAccessError('tenant-web', { tenantId: 't1', merchantAccount: { status: 'SUSPENDED' } })).toBe('MERCHANT_ACCOUNT_CANNOT_LOGIN_TENANT_APP');
    expect(webAppAccessError('merchant-web', { tenantId: 't1' })).toBe('TENANT_ACCOUNT_CANNOT_LOGIN_MERCHANT_APP');
    expect(webAppAccessError('merchant-web', { tenantId: 't1', merchantAccount: { status: 'SUSPENDED' } })).toBe('MERCHANT_ACCOUNT_INACTIVE');
  });
  it('allows only platform accounts in master admin', () => {
    expect(webAppAccessError('master-admin', { tenantId: null })).toBeNull();
    expect(webAppAccessError('master-admin', { tenantId: 't1' })).toBe('MASTER_ADMIN_ACCOUNT_REQUIRED');
  });
});
