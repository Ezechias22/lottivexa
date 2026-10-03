import { describe, expect, it } from "vitest";
import { tenantTabFromSearch, tenantTabHref } from "./tenant-navigation";

const tabs = ["dashboard", "reports", "branding"];

describe("tenant page navigation", () => {
  it("restores the selected page from the URL after refresh", () => {
    expect(tenantTabFromSearch("?tab=reports", tabs)).toBe("reports");
  });

  it("falls back safely for an unknown page", () => {
    expect(tenantTabFromSearch("?tab=not-a-page", tabs)).toBe("dashboard");
  });

  it("keeps the current tenant route when changing pages", () => {
    expect(tenantTabHref("https://tenant.example.com/console?x=1#main", "reports"))
      .toBe("/console?x=1&tab=reports#main");
  });
});
