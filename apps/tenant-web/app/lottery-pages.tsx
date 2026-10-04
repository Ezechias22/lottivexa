'use client';

import { FormEvent, useEffect, useState } from 'react';
import ManualResults from './manual-results';
import { describeDraw } from './draw-label';
import { useI18n } from './i18n';

type Row = Record<string, any>;
type Request = (path: string, init?: RequestInit) => Promise<any>;

export function LotteryCompact({ games, request, reload, can }: { games: Row[]; request: Request; reload: () => Promise<void>; can: (permission: string) => boolean }) {
  const { t } = useI18n();
  const [blocked, setBlocked] = useState<Row[]>([]);
  const [message, setMessage] = useState('');
  const [selectedGame, setSelectedGame] = useState('__ALL__');
  const [selectedBet, setSelectedBet] = useState('__ALL__');
  useEffect(() => { void request('/lottery/limits').then(value => setBlocked(Array.isArray(value) ? value : [])).catch(() => {}); }, [request]);
  if (!can('settings.view') && !can('settings.edit')) return null;
  async function execute(work: () => Promise<any>, success: string) {
    try { setMessage(''); await work(); setMessage(success); await reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  async function blockNumber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const x = Object.fromEntries(new FormData(form).entries());
    const key = String(x.numberKey).trim();
    const selectedEntry = games.flatMap(game => (game.betTypes ?? []).map((entry: Row) => ({ game, entry }))).find(({ game, entry }) => `${game.id}|${entry.betType.id}` === selectedBet);
    const targets = selectedGame === '__ALL__'
      ? (selectedBet === '__ALL__'
        ? [{ gameId: undefined, betTypeId: undefined }]
        : games.flatMap(game => (game.betTypes ?? []).filter((entry: Row) => entry.betType.code === selectedEntry?.entry.betType.code).map((entry: Row) => ({ gameId: game.id, betTypeId: entry.betType.id }))))
      : [{ gameId: selectedGame, betTypeId: selectedBet === '__ALL__' ? undefined : selectedBet }];
    await execute(async () => { for (const target of targets) await request('/lottery/blocked-numbers', { method: 'POST', body: JSON.stringify({ ...target, numberKey: key }) }); }, t('lottery.numberBlocked'));
    form.reset();
    setSelectedGame('__ALL__'); setSelectedBet('__ALL__');
  }
  async function unblock(id: string) { await execute(() => request(`/lottery/limits/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled: false }) }), t('lottery.numberUnblocked')); }
  return <>
    <section className="panel">
      <div className="title"><div><h2>{t('lottery.catalog')}</h2><p className="muted">{t('lottery.catalogHelp')}</p></div></div>
      <div className="cards">{games.filter(game => game.catalogCode).map(game => <article key={game.id}><span>{game.catalogCode}</span><strong>{game.name}</strong><small>{game.status}</small></article>)}</div>
    </section>
    {can('settings.edit') && <section className="panel">
      <h2>{t('lottery.blockNumbers')}</h2><p className="muted">{t('lottery.blockNumbersHelp')}</p>
      <form className="form one" onSubmit={blockNumber}>
        <label>{t('lottery.game')}<select name="gameId" value={selectedGame} onChange={event => { setSelectedGame(event.target.value); setSelectedBet('__ALL__'); }}><option value="__ALL__">Tout lotri</option>{games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>
        <label>{t('lottery.betType')}<select name="betTypeId" value={selectedBet} onChange={event => setSelectedBet(event.target.value)}><option value="__ALL__">{t('lottery.allBetTypes')}</option>{games.filter(game => selectedGame === '__ALL__' || game.id === selectedGame).flatMap(game => (game.betTypes ?? []).map((entry: Row) => <option key={`${game.id}|${entry.betType.id}`} value={selectedGame === '__ALL__' ? `${game.id}|${entry.betType.id}` : entry.betType.id}>{game.name} — {entry.betType.name}</option>))}</select></label>
        <label>{t('lottery.blockedNumber')}<input name="numberKey" placeholder="45, 12-34 or 45@1" required /></label>
        <button>{t('lottery.blockNumber')}</button>
      </form>
      <div className="domain-list">{blocked.filter(item => item.active).map(item => <article className="domain" key={item.id}><div><b>{item.numberKey}</b><small>{item.game?.name ?? 'Tout lotri'}{item.betType ? ` · ${item.betType.name}` : ''}</small></div><button className="danger" onClick={() => void unblock(item.id)}>{t('lottery.unblockNumber')}</button></article>)}</div>
    </section>}
    {message && <p className="message">{message}</p>}
  </>;
}

export function LotterySchedules({ games, request, reload, can }: { games: Row[]; request: Request; reload: () => Promise<void>; can: (permission: string) => boolean }) {
  const { t } = useI18n();
  const schedules = games.flatMap(game => (game.schedules ?? []).map((schedule: Row) => ({ ...schedule, gameName: game.name })));
  const [message, setMessage] = useState('');
  async function save(schedule: Row, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const x = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { setMessage(''); await request(`/lottery/schedules/${schedule.id}`, { method: 'PATCH', body: JSON.stringify({ opensAt: x.opensAt, closesAt: x.closesAt, resultAt: x.resultAt }) }); setMessage('Orè a mete ajou.'); await reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  return <section className="panel"><h2>{t('lottery.schedules')}</h2><p className="muted">Ajiste lè ouvèti, fèmti ak rezilta pou chak orè.</p>{schedules.map(schedule => <article className="domain" key={schedule.id}><div><b>{schedule.gameName}</b><small>{t('lottery.dayPrefix')} {schedule.weekday} · {schedule.active ? t('lottery.active') : t('lottery.inactive')}</small></div><form className="inline" onSubmit={event => void save(schedule, event)}><label>Ouvèti<input name="opensAt" type="time" defaultValue={String(schedule.opensAt ?? '').slice(0, 5)} required disabled={!can('settings.edit')} /></label><label>{t('lottery.closeTime')}<input name="closesAt" type="time" defaultValue={String(schedule.closesAt ?? '').slice(0, 5)} required disabled={!can('settings.edit')} /></label><label>{t('lottery.resultTime')}<input name="resultAt" type="time" defaultValue={String(schedule.resultAt ?? '').slice(0, 5)} required disabled={!can('settings.edit')} /></label>{can('settings.edit') && <button>Save</button>}</form>{can('settings.edit') && <button className={schedule.active ? 'danger' : ''} onClick={() => void request(`/lottery/schedules/${schedule.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !schedule.active }) }).then(reload)}>{schedule.active ? t('lottery.closeDraw') : t('lottery.activateDraw')}</button>}</article>)}{!schedules.length && <p className="empty">{t('table.empty')}</p>}{message && <p className="message">{message}</p>}</section>;
}

export function ManualResultsPage({ draws, request, reload }: { draws: Row[]; request: Request; reload: () => Promise<void> }) {
  return <ManualResults draws={draws as any} request={request} reload={reload} showHistory={false} />;
}

export function PublishedResults({ draws }: { draws: Row[] }) {
  const { language, t } = useI18n();
  const rows = draws.filter(draw => draw.status === 'RESULT_PUBLISHED');
  return <section className="panel"><h2>Résultats publiés</h2><div className="table-wrap"><table><thead><tr><th>{t('result.lottery')}</th><th>{t('result.draw')}</th><th>{t('result.numbers')}</th></tr></thead><tbody>{rows.map(draw => <tr key={draw.id}><td><span className="result-game">{draw.game?.logoUrl && <img src={draw.game.logoUrl} alt="" />}{draw.game?.name ?? '—'}</span></td><td>{describeDraw(draw, language)}</td><td><strong>{draw.result?.winningKeys?.join(', ') ?? '—'}</strong></td></tr>)}{!rows.length && <tr><td colSpan={3} className="empty">{t('table.empty')}</td></tr>}</tbody></table></div></section>;
}
