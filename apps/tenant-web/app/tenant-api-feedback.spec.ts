import { describe, expect, it } from "vitest";
import {
  formatTenantApiError,
  normalizeMerchantCreateForm,
} from "./tenant-api-feedback";

describe("tenant API feedback", () => {
  it("omits blank optional contact fields from merchant creation", () => {
    const payload = normalizeMerchantCreateForm({
      displayName: "  Seller  ",
      merchantNumber: "  M-10  ",
      username: "  seller10  ",
      email: "   ",
      phone: "   ",
      branchId: "branch-1",
      commissionPercentage: "12.5",
    });
    expect(payload).toMatchObject({
      displayName: "Seller",
      merchantNumber: "M-10",
      username: "seller10",
      branchId: "branch-1",
      commissionPercentage: "12.5",
    });
    expect(payload.email).toBeUndefined();
    expect(payload.phone).toBeUndefined();
  });

  it("reads nested API validation errors and replaces raw HTTP codes", () => {
    expect(
      formatTenantApiError(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "email must be an email",
            details: ["email must be an email"],
          },
        },
        400,
        "ht",
      ),
    ).toBe("Imèl la pa valab. Korije l oswa kite chan sa a vid.");
  });

  it("shows a specific French message when the branch is invalid", () => {
    expect(
      formatTenantApiError(
        { error: { code: "INVALID_BRANCH", message: "INVALID_BRANCH" } },
        400,
        "fr",
      ),
    ).toContain("succursale choisie");
  });

  it("translates report scope errors into clear Haitian Creole", () => {
    expect(formatTenantApiError({ error: { code: "REPORT_MERCHANT_OFFICE_MISMATCH" } }, 400, "ht")).toContain("pa nan biwo oswa santral");
    expect(formatTenantApiError({ error: { code: "TENANT_COUNTRY_LOCKED_AFTER_FIRST_TICKET" } }, 400, "ht")).toContain("apre premye tikè a");
  });

  it("explains invalid merchant commission rates in Haitian Creole", () => {
    expect(
      formatTenantApiError(
        { error: { code: "INVALID_COMMISSION_PERCENTAGE" } },
        400,
        "ht",
      ),
    ).toContain("ant 0 ak 100");
  });
});
