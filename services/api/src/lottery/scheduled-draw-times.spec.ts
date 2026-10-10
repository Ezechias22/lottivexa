import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "../jobs/jobs-policy";
import { scheduledDrawTimeUpdate, type ScheduleDrawTiming } from "./scheduled-draw-times";

const now = new Date("2026-10-10T12:00:00.000Z");
const schedule: ScheduleDrawTiming = {
  weekday: 1,
  timezone: "America/Port-au-Prince",
  previousResultAt: "14:30",
  opensAt: "08:00",
  closesAt: "14:20",
  resultAt: "14:30",
};

function generatedDraw(status = "SCHEDULED") {
  const date = "2026-10-12";
  return {
    id: "draw-1",
    drawNumber: "NY-20261012-1430",
    status,
    opensAt: zonedTimeToUtc(date, "00:00", schedule.timezone),
    closesAt: zonedTimeToUtc(date, "14:15", schedule.timezone),
    resultAt: zonedTimeToUtc(date, schedule.previousResultAt, schedule.timezone),
  };
}

describe("scheduled draw time synchronization", () => {
  it("maps a future generated draw to the updated local schedule times", () => {
    const update = scheduledDrawTimeUpdate(generatedDraw(), schedule, "NY", now);

    expect(update).toEqual({
      drawNumber: "NY-20261012-1430",
      opensAt: zonedTimeToUtc("2026-10-12", "08:00", schedule.timezone),
      closesAt: zonedTimeToUtc("2026-10-12", "14:20", schedule.timezone),
      resultAt: zonedTimeToUtc("2026-10-12", "14:30", schedule.timezone),
    });
  });

  it.each(["OPEN", "CLOSED", "RESULT_PENDING", "RESULT_PUBLISHED", "CANCELLED"])(
    "leaves a %s draw unchanged",
    (status) => {
      expect(scheduledDrawTimeUpdate(generatedDraw(status), schedule, "NY", now)).toBeNull();
    },
  );

  it("leaves custom draws and draws from another schedule slot unchanged", () => {
    const custom = { ...generatedDraw(), drawNumber: "SPECIAL-NY-1" };
    const otherSlot = { ...schedule, previousResultAt: "15:00" };

    expect(scheduledDrawTimeUpdate(custom, schedule, "NY", now)).toBeNull();
    expect(scheduledDrawTimeUpdate(generatedDraw(), otherSlot, "NY", now)).toBeNull();
  });

  it("keeps the generated draw number in sync when the result time changes", () => {
    const update = scheduledDrawTimeUpdate(
      generatedDraw(),
      { ...schedule, resultAt: "14:45" },
      "NY",
      now,
    );

    expect(update?.drawNumber).toBe("NY-20261012-1445");
    expect(update?.resultAt).toEqual(zonedTimeToUtc("2026-10-12", "14:45", schedule.timezone));
  });
});
