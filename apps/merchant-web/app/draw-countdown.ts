export type DrawCountdownInput = {
  status?: string;
  closesAt?: string | Date | null;
  scheduleEnabled?: boolean;
  game?: { cutoffSeconds?: number | null } | null;
};

export function drawSaleClosingAt(draw: DrawCountdownInput): number | null {
  const raw = draw.closesAt instanceof Date
    ? draw.closesAt.getTime()
    : typeof draw.closesAt === 'string'
      ? Date.parse(draw.closesAt)
      : Number.NaN;
  if (!Number.isFinite(raw)) return null;
  const cutoffSeconds = Number(draw.game?.cutoffSeconds ?? 0);
  return raw - (Number.isFinite(cutoffSeconds) ? Math.max(0, cutoffSeconds) : 0) * 1000;
}

export function isDrawOpenForSale(draw: DrawCountdownInput, now = Date.now()): boolean {
  const closesAt = drawSaleClosingAt(draw);
  return draw.status === 'OPEN' && draw.scheduleEnabled !== false && closesAt !== null && closesAt > now;
}

export function formatDrawCountdown(closesAt: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((closesAt - now) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  const clock = [hours, minutes, remainder].map(value => String(value).padStart(2, '0')).join(':');
  return days > 0 ? `${days}j ${clock}` : clock;
}
