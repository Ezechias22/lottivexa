type DrawLabel = {
  game?: { name?: string; code?: string };
  name?: string;
  resultAt?: string;
  opensAt?: string;
  closesAt?: string;
  drawNumber?: string;
  session?: string;
  sessionType?: string;
};

type Session = 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' | 'UNKNOWN';
const zone = 'America/Port-au-Prince';

function sessionFromText(value: string): Session | null {
  const text = value.toUpperCase().replace(/[^A-Z0-9]+/g, ' ');
  if (/\b(MORNING|MATIN|MATEN)\b/.test(text)) return 'MORNING';
  if (/\b(MID|MIDI|MIDDAY|NOON|DAY|JOUR|JOUNEN)\b/.test(text)) return 'MIDDAY';
  if (/\b(EVENING|SOIR|SWA|EVE)\b/.test(text)) return 'EVENING';
  if (/\b(NIGHT|NUIT|LANNWIT)\b/.test(text)) return 'NIGHT';
  return null;
}

function sessionFromHour(hour: number): Session {
  if (hour < 12) return 'MORNING';
  if (hour < 16) return 'MIDDAY';
  if (hour < 21) return 'EVENING';
  return 'NIGHT';
}

export function drawSession(draw: DrawLabel): Session {
  const explicit = sessionFromText(`${draw.session ?? ''} ${draw.sessionType ?? ''} ${draw.name ?? ''} ${draw.drawNumber ?? ''}`);
  if (explicit) return explicit;

  // Scheduled draw numbers end in the local result time (for example GA-20260920-1229).
  const scheduledTime = draw.drawNumber?.match(/(?:^|[-_])(\d{4})$/)?.[1];
  if (scheduledTime) {
    const hour = Number(scheduledTime.slice(0, 2));
    const minute = Number(scheduledTime.slice(2));
    if (hour < 24 && minute < 60) return sessionFromHour(hour);
  }

  const source = draw.resultAt ?? draw.closesAt ?? draw.opensAt;
  if (!source) return 'UNKNOWN';
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return 'UNKNOWN';
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date));
  return sessionFromHour(hour);
}

function sessionLabel(session: Session, language: 'ht' | 'fr') {
  const labels = {
    MORNING: language === 'fr' ? 'Normal · Matin' : 'Nòmal · Maten',
    MIDDAY: language === 'fr' ? 'Normal · Midi' : 'Nòmal · Midi',
    EVENING: language === 'fr' ? 'Normal · Soir' : 'Nòmal · Swa',
    NIGHT: language === 'fr' ? 'Normal · Nuit' : 'Nòmal · Lannuit',
    UNKNOWN: language === 'fr' ? 'Séance à confirmer' : 'Sesyon pou verifye',
  };
  return labels[session];
}

export function drawLabel(draw: DrawLabel, language: 'ht' | 'fr') {
  const session = drawSession(draw);
  const source = draw.resultAt ?? draw.closesAt ?? draw.opensAt;
  const date = source ? new Date(source) : null;
  const game = draw.game?.name ?? (language === 'fr' ? 'Loterie' : 'Lotri');
  if (!date || Number.isNaN(date.getTime())) {
    return `${game} · ${sessionLabel(session, language)} · #${draw.drawNumber ?? ''}`;
  }
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  const formattedDate = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'fr-HT', {
    timeZone: zone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  return `${game} · ${sessionLabel(session, language)} · ${formattedDate} ${time} · #${draw.drawNumber ?? ''}`;
}

export function drawSessionLabel(draw: DrawLabel, language: 'ht' | 'fr') {
  return sessionLabel(drawSession(draw), language);
}
