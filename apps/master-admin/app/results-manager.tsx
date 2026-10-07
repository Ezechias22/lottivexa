'use client';

import {useMemo, useState, type FormEvent} from 'react';

type Draw = {
  id: string;
  drawNumber: string;
  status: string;
  drawDate?: string;
  resultAt?: string;
  closesAt?: string;
  tenantId?: string;
  game?: {id?: string; name?: string; code?: string; catalogCode?: string};
};

type Props = {
  draws: Draw[];
  request: (path: string, init?: RequestInit) => Promise<any>;
  reload: () => void | Promise<void>;
};

function scheduleSuffix(draw: Draw) {
  const prefix = draw.game?.code ? `${draw.game.code}-` : '';
  if (prefix && draw.drawNumber.startsWith(prefix)) return draw.drawNumber.slice(prefix.length);
  const scheduled = draw.drawNumber.match(/(?:^|[-_])(\d{8}[-_]\d{4})$/);
  return scheduled?.[1] ?? draw.drawNumber;
}

function describeDraw(draw: Draw) {
  const scheduled = draw.drawNumber.match(/(?:^|[-_])(\d{8})[-_](\d{4})$/);
  const sourceDate = scheduled
    ? new Date(`${scheduled[1].slice(0, 4)}-${scheduled[1].slice(4, 6)}-${scheduled[1].slice(6, 8)}T12:00:00Z`)
    : new Date(draw.drawDate ?? draw.resultAt ?? draw.closesAt ?? '');
  const hour = scheduled ? Number(scheduled[2].slice(0, 2)) : Number.isNaN(sourceDate.getTime()) ? -1 : Number(new Intl.DateTimeFormat('en-GB', {timeZone: 'America/Port-au-Prince', hour: '2-digit', hourCycle: 'h23'}).format(sourceDate));
  const session = hour < 0 ? 'Séance à confirmer' : hour < 12 ? 'Matin' : hour < 16 ? 'Midi' : hour < 21 ? 'Soir' : 'Nuit';
  const date = Number.isNaN(sourceDate.getTime())
    ? ''
    : new Intl.DateTimeFormat('fr-FR', {timeZone: scheduled || draw.drawDate ? 'UTC' : 'America/Port-au-Prince', day: '2-digit', month: '2-digit', year: 'numeric'}).format(sourceDate);
  const time = scheduled
    ? `${scheduled[2].slice(0, 2)}:${scheduled[2].slice(2)}`
    : draw.resultAt
      ? new Intl.DateTimeFormat('fr-FR', {timeZone: 'America/Port-au-Prince', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(draw.resultAt))
      : '';
  const dateTime = [date, time].filter(Boolean).join(' ');
  return [draw.game?.name ?? draw.game?.code ?? 'Loterie', session, dateTime].filter(Boolean).join(' · ');
}

function eligibleDraws(draws: Draw[]) {
  const ordered = draws
    .filter(draw => draw.status === 'CLOSED' || draw.status === 'RESULT_PENDING')
    .sort((a, b) => String(b.resultAt ?? b.drawDate ?? '').localeCompare(String(a.resultAt ?? a.drawDate ?? '')));
  const seen = new Set<string>();
  return ordered.filter(draw => {
    const game = draw.game?.catalogCode
      ? `catalog:${draw.game.catalogCode}`
      : `tenant:${draw.tenantId ?? draw.id}:${draw.game?.id ?? draw.game?.code ?? draw.game?.name ?? 'lottery'}`;
    const identity = `${game}:${scheduleSuffix(draw)}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export default function ResultsManager({draws, request, reload}: Props) {
  const options = useMemo(() => eligibleDraws(draws), [draws]);
  const [drawId, setDrawId] = useState('');
  const [numbers, setNumbers] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState<'success' | 'error' | ''>('');
  const selected = options.find(draw => draw.id === drawId);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const haitian = document.documentElement.lang === 'ht';
    const winningKeys = numbers.split(/[\s,;]+/).map(value => value.trim()).filter(Boolean);
    if (!winningKeys.length || winningKeys.length > 20 || winningKeys.some(value => !/^\d{1,5}$/.test(value))) {
      setNotice(haitian ? 'Antre 1 a 20 nimewo ki gen 1 a 5 chif, separe ak vigil.' : 'Saisissez de 1 à 20 numéros de 1 à 5 chiffres, séparés par des virgules.');
      setNoticeKind('error');
      return;
    }
    const label = describeDraw(selected);
    const confirmation = haitian
      ? `Pibliye rezilta pou ${label} : ${winningKeys.join(', ')} ? Piblikasyon an definitif.`
      : `Publier le résultat pour ${label} : ${winningKeys.join(', ')} ? La publication est définitive.`;
    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setNotice('');
    setNoticeKind('');
    try {
      const result = await request(`/results/master/draws/${encodeURIComponent(selected.id)}/publish`, {
        method: 'POST',
        body: JSON.stringify({winningKeys}),
      });
      const drawCount = Number(result?.drawsProcessed ?? 1);
      const ticketCount = Number(result?.ticketsProcessed ?? 0);
      setNotice(haitian
        ? `Rezilta pibliye pou ${drawCount} tiraj nan sistèm nan. ${ticketCount} tikè mete ajou.`
        : `Résultat publié pour ${drawCount} tirage(s) dans le système. ${ticketCount} ticket(s) recalculé(s).`);
      setNoticeKind('success');
      setNumbers('');
      setDrawId('');
      await reload();
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const messages: Record<string, string> = {
        DRAW_RESULT_ALREADY_PUBLISHED_DIFFERENTLY: 'Un résultat différent est déjà publié pour ce tirage. Contactez le support avant toute correction.',
        DRAW_NOT_READY_FOR_RESULT: 'Ce tirage n’est plus disponible pour la publication. Actualisez la page.',
      };
      const haitianMessages: Record<string, string> = {
        DRAW_RESULT_ALREADY_PUBLISHED_DIFFERENTLY: 'Gen yon lòt rezilta ki deja pibliye pou tiraj sa a. Kontakte sipò anvan nenpòt koreksyon.',
        DRAW_NOT_READY_FOR_RESULT: 'Tiraj sa a pa disponib ankò pou pibliye rezilta. Rafrechi paj la.',
      };
      setNotice((haitian ? haitianMessages[code] : messages[code]) ?? code);
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel master-results-manager">
    <div className="master-result-form-heading">
      <span className="master-result-eyebrow">Publication globale</span>
      <h2>Saisir un résultat manuellement</h2>
      <p>Vérifiez que tous les tickets vendus hors ligne sont synchronisés avant de publier. La publication est définitive.</p>
    </div>
    <form className="master-result-form" onSubmit={publish}>
      <label>
        <span>Tirage</span>
        <select value={drawId} onChange={event => setDrawId(event.target.value)} required>
          <option value="">Sélectionnez un tirage clôturé</option>
          {options.map(draw => <option value={draw.id} key={draw.id}>{describeDraw(draw)}</option>)}
        </select>
      </label>
      <label>
        <span>Numéros gagnants (dans l’ordre)</span>
        <input value={numbers} onChange={event => setNumbers(event.target.value)} inputMode="numeric" placeholder="12, 34, 56" required />
      </label>
      <button type="submit" disabled={busy || !selected}>{busy ? 'Publication…' : 'Publier le résultat'}</button>
    </form>
    {!options.length && <p className="master-result-empty">Aucun tirage clôturé ne peut recevoir un résultat pour le moment.</p>}
    {notice && <p className={`master-result-notice ${noticeKind}`} role="status">{notice}</p>}
  </section>;
}
