import { describe, expect, it } from "vitest";
import { groupSchedulesBySession, isScheduleSessionOpen } from "./schedule-sessions";

describe("draw session schedule grouping", () => {
  it("shows recurring weekdays as one session for each lottery and result time", () => {
    const sessions = groupSchedulesBySession([
      { id: "texas", name: "Texas", code: "TX", schedules: [
        { id: "mon", weekday: 1, resultAt: "13:00:00", active: true },
        { id: "tue", weekday: 2, resultAt: "13:00", active: true },
        { id: "eve", weekday: 2, resultAt: "20:00", active: false },
      ] },
      { id: "new-york", name: "New York", code: "NY", schedules: [
        { id: "ny", weekday: 1, resultAt: "13:00", active: false },
      ] },
    ]);

    expect(sessions).toHaveLength(3);
    expect(sessions.find((session) => session.gameId === "texas" && session.resultAt === "13:00")?.schedules).toHaveLength(2);
    expect(sessions.map((session) => `${session.gameName}|${session.resultAt}`)).toEqual([
      "New York|13:00", "Texas|13:00", "Texas|20:00",
    ]);
  });

  it("treats a partially active session as open so one action can close the whole session", () => {
    const [session] = groupSchedulesBySession([{ id: "texas", name: "Texas", schedules: [
      { resultAt: "13:00", active: true }, { resultAt: "13:00", active: false },
    ] }]);

    expect(isScheduleSessionOpen(session)).toBe(true);
  });
});
