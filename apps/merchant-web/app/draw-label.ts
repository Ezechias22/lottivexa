type DrawLabel = {
  game?: { name?: string; code?: string };
  name?: string;
  resultAt?: string;
  opensAt?: string;
  closesAt?: string;
  drawDate?: string;
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

function scheduledParts(draw: DrawLabel) {
  const parts = draw.drawNumber?.match(/(?:^|[-_])(\d{8})[-_](\d{4})$/);
  if (!parts) return null;
  const [, date, time] = parts;
  const year = Number(date.slice(0, 4)), month = Number(date.slice(4, 6)), day = Number(date.slice(6, 8));
  const hour = Number(time.slice(0, 2)), minute = Number(time.slice(2));
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return { date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`, hour, minute };
}

export function drawSession(draw: DrawLabel): Session {
  const explicit = sessionFromText(`${draw.session ?? ''} ${draw.sessionType ?? ''} ${draw.name ?? ''} ${draw.drawNumber ?? ''}`);
  if (explicit) return explicit;

  const scheduledTime = draw.drawNumber?.match(/(?:^|[-_])(\d{4})$/)?.[1];
  if (scheduledTime) {
    const hour = Number(scheduledTime.slice(0, 2)), minute = Number(scheduledTime.slice(2));
    if (hour < 24 && minute < 60) return sessionFromHour(hour);
  }

  const source = draw.drawDate ?? draw.opensAt ?? draw.closesAt ?? draw.resultAt;
  if (source) {
    const date = new Date(source);
    if (!Number.isNaN(date.getTime())) {
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(date));
      return sessionFromHour(hour);
    }
  }
  return 'UNKNOWN';
}

function sessionLabel(session: Session, language: 'ht' | 'fr') {
  const labels = {
    MORNING: language === 'fr' ? 'Matin' : 'Maten',
    MIDDAY: language === 'fr' ? 'Midi' : 'Midi',
    EVENING: language === 'fr' ? 'Soir' : 'Swa',
    NIGHT: language === 'fr' ? 'Nuit' : 'Lannuit',
    UNKNOWN: language === 'fr' ? 'Séance à confirmer' : 'Sesyon pou verifye',
  };
  return labels[session];
}

export function drawLabel(draw: DrawLabel, language: 'ht' | 'fr') {
  const session = drawSession(draw);
  const scheduled = scheduledParts(draw);
  const source = draw.drawDate ?? draw.opensAt ?? draw.closesAt ?? draw.resultAt;
  const date = scheduled ? new Date(`${scheduled.date}T12:00:00Z`) : source ? new Date(source) : null;
  const game = draw.game?.name ?? (language === 'fr' ? 'Loterie' : 'Lotri');
  if (!date || Number.isNaN(date.getTime())) {
    return `${game} · ${sessionLabel(session, language)}`;
  }
  const time = scheduled
    ? `${String(scheduled.hour).padStart(2, '0')}:${String(scheduled.minute).padStart(2, '0')}`
    : draw.opensAt || draw.closesAt || draw.resultAt
      ? new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(draw.opensAt ?? draw.closesAt ?? draw.resultAt!))
      : '';
  const formattedDate = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'fr-HT', {
    timeZone: scheduled || (draw.drawDate && source === draw.drawDate) ? 'UTC' : zone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  return `${game} · ${sessionLabel(session, language)} · ${formattedDate}${time ? ` ${time}` : ''}`;
}

export function compactDrawLabel(draw: DrawLabel, language: 'ht' | 'fr') {
  return drawLabel(draw, language).replace(/ · /g, ' ');
}

export function drawNameSessionLabel(draw: DrawLabel, language: 'ht' | 'fr') {
  const game = draw.game?.name ?? (language === 'fr' ? 'Loterie' : 'Lotri');
  return `${game} · ${sessionLabel(drawSession(draw), language)}`;
}

export function drawSessionLabel(draw: DrawLabel, language: 'ht' | 'fr') {
  return sessionLabel(drawSession(draw), language);
}

type TicketDraws = {
  draw?: DrawLabel | null;
};

export function ticketDrawLabels(ticket: { draw?: DrawLabel | null; ticketDraws?: TicketDraws[] }, language: 'ht' | 'fr') {
  const linked = (ticket.ticketDraws ?? []).map((item) => item.draw).filter((draw): draw is DrawLabel => Boolean(draw));
  const draws = linked.length ? linked : ticket.draw ? [ticket.draw] : [];
  return [...new Set(draws.map((draw) => drawLabel(draw, language)))].join(' / ');
}
