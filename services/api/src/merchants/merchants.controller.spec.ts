import "reflect-metadata";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateMerchantDto } from "./merchants.controller";

function validMerchant(overrides: Partial<CreateMerchantDto> = {}) {
  return Object.assign(new CreateMerchantDto(), {
    displayName: "Machann",
    merchantNumber: "M-100",
    username: "machann100",
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
});
