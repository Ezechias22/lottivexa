export type WebClientApp = 'tenant-web' | 'merchant-web' | 'master-admin';

export type WebAccount = {
  tenantId: string | null;
  merchantAccount?: { status?: string } | null;
};

export function webAppAccessError(app: WebClientApp, account: WebAccount): string | null {
  if (app === 'master-admin') return account.tenantId === null ? null : 'MASTER_ADMIN_ACCOUNT_REQUIRED';
  if (account.tenantId === null) return 'TENANT_ACCOUNT_REQUIRED';
  const hasMerchantAccount = Boolean(account.merchantAccount);
  if (app === 'tenant-web' && hasMerchantAccount) return 'MERCHANT_ACCOUNT_CANNOT_LOGIN_TENANT_APP';
  if (app === 'merchant-web' && !hasMerchantAccount) return 'TENANT_ACCOUNT_CANNOT_LOGIN_MERCHANT_APP';
  if (app === 'merchant-web' && account.merchantAccount?.status !== 'ACTIVE') return 'MERCHANT_ACCOUNT_INACTIVE';
  return null;
}
