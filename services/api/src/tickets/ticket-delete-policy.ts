/** Permanent operational deletion belongs to the tenant, never a merchant account. */
export function canTenantDeleteTicket(isMerchantAccount: boolean): boolean {
  return !isMerchantAccount;
}
