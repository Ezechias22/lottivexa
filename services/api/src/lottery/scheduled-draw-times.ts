import { localDateParts, zonedTimeToUtc } from "../jobs/jobs-policy";

export type ScheduleDrawTiming = {
  weekday: number;
  timezone: string;
  previousResultAt: string;
  opensAt: string;
  closesAt: string;
  resultAt: string;
};

export type ScheduledDrawCandidate = {
  id: string;
  drawNumber: string;
  status: string;
  opensAt: Date;
  closesAt: Date;
  resultAt: Date;
};

export function scheduledDrawTimeUpdate(
  draw: ScheduledDrawCandidate,
  schedule: ScheduleDrawTiming,
  gameCode: string,
  now: Date,
) {
  if (draw.status !== "SCHEDULED" || draw.resultAt <= now) return null;

  const local = localDateParts(draw.resultAt, schedule.timezone);
  const localResultAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: schedule.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(draw.resultAt);

  if (local.weekday !== schedule.weekday || localResultAt !== schedule.previousResultAt) {
    return null;
  }

  const expectedDrawNumber = `${gameCode}-${local.date.replaceAll("-", "")}-${schedule.previousResultAt.replace(":", "")}`;
  if (draw.drawNumber !== expectedDrawNumber) return null;

  return {
    drawNumber: `${gameCode}-${local.date.replaceAll("-", "")}-${schedule.resultAt.replace(":", "")}`,
    opensAt: zonedTimeToUtc(local.date, schedule.opensAt, schedule.timezone),
    closesAt: zonedTimeToUtc(local.date, schedule.closesAt, schedule.timezone),
    resultAt: zonedTimeToUtc(local.date, schedule.resultAt, schedule.timezone),
  };
}
