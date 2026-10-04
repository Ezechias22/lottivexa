import "reflect-metadata";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateMerchantDto } from "./merchants.controller";

function validMerchant(overrides: Partial<CreateMerchantDto> = {}) {
  return Object.assign(new CreateMerchantDto(), {
    displayName: "Machann",
    merchantNumber: "M-100",
    username: "machann100",
    commissionPercentage: "10",
    countryCode: "HT",
    email: "",
    phone: "",
    temporaryPassword: "safe-temporary-password",
    branchId: "branch-1",
    ...overrides,
  });
}

describe("create merchant validation", () => {
  it("allows blank optional email and phone fields", async () => {
    expect(await validate(validMerchant())).toEqual([]);
  });

  it("still rejects a malformed non-empty email", async () => {
    const errors = await validate(validMerchant({ email: "not-an-email" }));
    expect(errors.map((error) => error.property)).toContain("email");
  });

  it("requires a numeric merchant commission percentage", async () => {
    const errors = await validate(validMerchant({ commissionPercentage: "ten" }));
    expect(errors.map((error) => error.property)).toContain("commissionPercentage");
  });

  it("rejects a country that does not have a supported currency", async () => {
    const errors = await validate(validMerchant({ countryCode: "ZZ" }));
    expect(errors.map((error) => error.property)).toContain("countryCode");
  });

  it("allows the merchant country to be inherited from its selected office", async () => {
    const merchant = validMerchant();
    delete (merchant as Partial<CreateMerchantDto>).countryCode;
    expect(await validate(merchant)).toEqual([]);
  });
});
