import { describe, expect, it } from "vitest";
import { assertPositionedOddsType, assertScheduleTimes, normalizeBoletMultipliers } from "./lottery-policy";

describe("tenant lottery settings policy", () => {
  it("allows per-result Bolet multipliers", () => {
    expect(() => assertPositionedOddsType("BOLET", 1)).not.toThrow();
    expect(() => assertPositionedOddsType("BOLET", 2)).not.toThrow();
    expect(() => assertPositionedOddsType("BOLET", 3)).not.toThrow();
  });

  it("keeps positional odds limited to supported bet types and places", () => {
    expect(() => assertPositionedOddsType("MARYAJ", 1)).toThrow("INVALID_RESULT_POSITION");
    expect(() => assertPositionedOddsType("BOLET", 4)).toThrow("INVALID_RESULT_POSITION");
  });

  it("accepts three positive multipliers and rejects invalid settings", () => {
    expect(normalizeBoletMultipliers(["60", "20", "10"])).toEqual(["60", "20", "10"]);
    expect(() => normalizeBoletMultipliers(["60", "0", "10"])).toThrow("INVALID_BOLET_PAYOUTS");
    expect(() => normalizeBoletMultipliers(["60", "20"])).toThrow("INVALID_BOLET_PAYOUTS");
  });

  it("requires opening before closing and results after closing", () => {
    expect(() => assertScheduleTimes("06:00", "17:00", "18:00")).not.toThrow();
    expect(() => assertScheduleTimes("17:00", "06:00", "18:00")).toThrow("INVALID_SCHEDULE_TIMES");
    expect(() => assertScheduleTimes("06:00", "17:00", "16:00")).toThrow("INVALID_SCHEDULE_TIMES");
    expect(() => assertScheduleTimes("06:00", "17:00", "17:00")).toThrow("INVALID_SCHEDULE_TIMES");
  });
});
