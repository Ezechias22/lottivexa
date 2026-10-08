import { describe, expect, it } from "vitest";
import { buildTenantSalesBreakdown, normalizeTenantSalesAggregates, platformTicketSalesWhere } from "./master-sales-policy";

describe("master platform tenant sales", () => {
  it("excludes cancelled, void, and deleted tickets from platform sales aggregates", () => {
    expect(platformTicketSalesWhere()).toEqual({
      status: { notIn: ["CANCELLED", "VOID"] },
      events: { none: { type: "DELETED" } },
    });
  });

  it("returns separate sales and currency for every tenant, including tenants with no sales", () => {
    const rows = buildTenantSalesBreakdown(
      [
        { id: "tenant-1", slug: "north", legalName: "North Office" },
        { id: "tenant-2", slug: "south", legalName: "South Office" },
      ],
      [{ tenantId: "tenant-1", tickets: 2, amount: "35.50" }],
      new Map([["tenant-1", "USD"], ["tenant-2", "HTG"]]),
    );
    expect(rows).toEqual([
      { tenantId: "tenant-1", tenantName: "North Office", tenantSlug: "north", currency: "USD", tickets: 2, amount: "35.50" },
      { tenantId: "tenant-2", tenantName: "South Office", tenantSlug: "south", currency: "HTG", tickets: 0, amount: "0" },
    ]);
  });

  it("normalizes Prisma groupBy rows before tenant and currency totals are calculated", () => {
    expect(normalizeTenantSalesAggregates([
      { tenantId: "tenant-1", _count: { _all: 2 }, _sum: { amount: { toString: () => "35.50" } } },
      { tenantId: "tenant-2", _count: { _all: 0 }, _sum: { amount: null } },
    ])).toEqual([
      { tenantId: "tenant-1", tickets: 2, amount: "35.5" },
      { tenantId: "tenant-2", tickets: 0, amount: "0" },
    ]);
  });

  it("rejects malformed aggregate output instead of silently reporting false totals", () => {
    expect(() => normalizeTenantSalesAggregates([
      { tenantId: "tenant-1", _count: true, _sum: { amount: "10" } },
    ])).toThrow("INVALID_TENANT_SALES_AGGREGATE");
  });
});
