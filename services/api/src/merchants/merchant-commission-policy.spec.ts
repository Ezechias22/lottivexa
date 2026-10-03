import { describe, expect, it } from "vitest";
import { merchantCommissionPercentage } from "./merchant-commission-policy";

describe("merchant commission percentage", () => {
  it("keeps a valid percentage for commission rule creation", () => {
    expect(merchantCommissionPercentage("12.5")).toBe("12.5");
  });

  it("accepts zero and one hundred percent", () => {
    expect(merchantCommissionPercentage("0")).toBe("0");
    expect(merchantCommissionPercentage("100")).toBe("100");
  });

  it("rejects values outside the percentage range", () => {
    expect(() => merchantCommissionPercentage("-0.01")).toThrow("INVALID_COMMISSION_PERCENTAGE");
    expect(() => merchantCommissionPercentage("100.01")).toThrow("INVALID_COMMISSION_PERCENTAGE");
  });
});
