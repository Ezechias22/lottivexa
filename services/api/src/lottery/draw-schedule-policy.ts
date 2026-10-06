import { prisma } from '@lottivexa/database';

export type DrawScheduleIdentity = {
  gameId: string;
  drawNumber: string;
  drawDate: Date | string;
};

export type ScheduleSlot = {
  gameId: string;
  weekday: number;
  resultAt: string;
  active: boolean;
};

/** Generated draw numbers end in the local draw date and result time. */
export function drawScheduleSlot(draw: DrawScheduleIdentity) {
  const encoded = draw.drawNumber.match(/(?:^|[-_])(\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})$/);
  if (!encoded) return null;
  const [, yearText, monthText, dayText, hourText, minuteText] = encoded;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = Number(hourText), minute = Number(minuteText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59) return null;
  return { gameId: draw.gameId, weekday: date.getUTCDay(), resultAt: `${hourText}:${minuteText}` };
}

/** A manually created draw with no matching recurring schedule stays available. */
export function isDrawScheduleEnabled(draw: DrawScheduleIdentity, schedules: ScheduleSlot[]) {
  const slot = drawScheduleSlot(draw);
  if (!slot) return true;
  const matches = schedules.filter(schedule =>
    schedule.gameId === slot.gameId &&
    schedule.weekday === slot.weekday &&
    schedule.resultAt.slice(0, 5) === slot.resultAt,
  );
  return matches.length === 0 || matches.some(schedule => schedule.active);
}

export async function isConfiguredDrawEnabled(tenantId: string, draw: DrawScheduleIdentity) {
  const slot = drawScheduleSlot(draw);
  if (!slot) return true;
  const schedules = await prisma.gameSchedule.findMany({
    where: { tenantId, gameId: slot.gameId, weekday: slot.weekday },
    select: { gameId: true, weekday: true, resultAt: true, active: true },
  });
  return isDrawScheduleEnabled(draw, schedules);
}
