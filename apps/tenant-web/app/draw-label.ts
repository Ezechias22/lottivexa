type DrawLabel = {
  drawNumber?: string;
  name?: string;
  resultAt?: string;
  drawDate?: string;
  opensAt?: string;
  closesAt?: string;
  session?: string;
  sessionType?: string;
  game?: { name?: string };
};

type Session = 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' | 'UNKNOWN';
const zone = 'America/Port-au-Prince';

function fromHour(hour: number): Session {
  if (hour < 12) return 'MORNING';
  if (hour < 16) return 'MIDDAY';
  if (hour < 21) return 'EVENING';
  return 'NIGHT';
}

function getSession(draw: DrawLabel): Session {
  const text = `${draw.session ?? ''} ${draw.sessionType ?? ''} ${draw.name ?? ''} ${draw.drawNumber ?? ''}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ');
  if (/\b(MORNING|MATIN|MATEN)\b/.test(text)) return 'MORNING';
  if (/\b(MID|MIDI|MIDDAY|NOON|DAY|JOUR|JOUNEN)\b/.test(text)) return 'MIDDAY';
  if (/\b(EVENING|SOIR|SWA|EVE|ASWE)\b/.test(text)) return 'EVENING';
  if (/\b(NIGHT|NUIT|LANNWIT)\b/.test(text)) return 'NIGHT';

  const scheduledTime = draw.drawNumber?.match(/(?:^|[-_])(\d{4})$/)?.[1];
  if (scheduledTime) {
    const hour = Number(scheduledTime.slice(0, 2)), minute = Number(scheduledTime.slice(2));
    if (hour < 24 && minute < 60) return fromHour(hour);
  }

  const source = draw.opensAt ?? draw.closesAt ?? draw.resultAt;
  if (source) {
    const date = new Date(source);
    if (!Number.isNaN(date.getTime())) return fromHour(Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date)));
  }
  return 'UNKNOWN';
}

export function drawSessionLabel(draw: DrawLabel, language: 'ht' | 'fr') {
  const labels = {
    MORNING: language === 'fr' ? 'Matin' : 'Maten',
    MIDDAY: language === 'fr' ? 'Midi' : 'Midi',
    EVENING: language === 'fr' ? 'Soir' : 'Swa',
    NIGHT: language === 'fr' ? 'Nuit' : 'Lannuit',
    UNKNOWN: language === 'fr' ? 'Séance à confirmer' : 'Sesyon pou verifye',
  };
  return labels[getSession(draw)];
}

export function describeDraw(draw: DrawLabel, language: 'ht' | 'fr') {
  const game = draw.game?.name ?? (language === 'fr' ? 'Loterie' : 'Lotri');
  const scheduled = draw.drawNumber?.match(/(?:^|[-_])(\d{8})[-_](\d{4})$/);
  const source = draw.drawDate ?? draw.opensAt ?? draw.closesAt ?? draw.resultAt;
  if (!source) return `${game} · ${drawSessionLabel(draw, language)}`;
  const encodedDate = scheduled ? `${scheduled[1].slice(0, 4)}-${scheduled[1].slice(4, 6)}-${scheduled[1].slice(6, 8)}` : null;
  const date = new Date(encodedDate ? `${encodedDate}T12:00:00Z` : source);
  if (Number.isNaN(date.getTime())) return `${game} · ${drawSessionLabel(draw, language)}`;
  const formattedDate = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'fr-HT', {
    timeZone: encodedDate || (draw.drawDate && source === draw.drawDate) ? 'UTC' : zone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  const encodedTime = scheduled?.[2];
  const encodedHour = encodedTime ? Number(encodedTime.slice(0, 2)) : -1;
  const encodedMinute = encodedTime ? Number(encodedTime.slice(2)) : -1;
  const time = encodedHour >= 0 && encodedHour < 24 && encodedMinute >= 0 && encodedMinute < 60
    ? `${encodedTime!.slice(0, 2)}:${encodedTime!.slice(2)}`
    : draw.opensAt || draw.closesAt || draw.resultAt
      ? new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(draw.opensAt ?? draw.closesAt ?? draw.resultAt!))
      : '';
  return `${game} · ${drawSessionLabel(draw, language)} · ${formattedDate}${time ? ` ${time}` : ''}`;
}
