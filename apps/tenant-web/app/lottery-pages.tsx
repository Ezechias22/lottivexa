'use client';

import { FormEvent, useEffect, useState } from 'react';
import ManualResults from './manual-results';
import { describeDraw, drawSessionLabel } from './draw-label';
import { useI18n } from './i18n';
import TenantScheduleSessions from './tenant-schedule-sessions';

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
  return <>
    <section className="panel">
      <h2>{t('lottery.availabilityTitle')}</h2>
      <p className="muted">{t('lottery.availabilityHelp')}</p>
      <TenantScheduleSessions games={games} request={request} reload={reload} canEdit={can('settings.edit')} />
    </section>
  </>;
}

export function ManualResultsPage({ draws, request, reload }: { draws: Row[]; request: Request; reload: () => Promise<void> }) {
  return <ManualResults draws={draws as any} request={request} reload={reload} showHistory={false} />;
}

export function PublishedResults({ draws }: { draws: Row[] }) {
  const { language, t } = useI18n();
  const rows = draws.filter(draw => draw.status === 'RESULT_PUBLISHED');
  const groups = [...rows.reduce((map, draw) => {
    const key = draw.game?.id ?? draw.game?.code ?? draw.game?.name ?? draw.id;
    const group = map.get(key) ?? { game: draw.game, draws: [] as Row[] };
    group.draws.push(draw); map.set(key, group); return map;
  }, new Map<string, { game: Row; draws: Row[] }>()).values()];
  return <section className="panel tenant-results-panel"><div className="tenant-results-heading"><div><span className="eyebrow">{language === 'fr' ? 'RÉSULTATS DU JOUR' : 'REZILTA TIRAJ YO'}</span><h2>{language === 'fr' ? 'Résultats publiés' : 'Rezilta ki soti yo'}</h2></div><span className="tenant-results-count">{rows.length}</span></div>
    <div className="tenant-results-list">{groups.map((group, index) => <article className="tenant-result-game" key={String(group.game?.id ?? group.game?.code ?? index)}>
      <div className="tenant-result-brand">{group.game?.logoUrl ? <img src={group.game.logoUrl} alt="" /> : <span>{String(group.game?.code ?? group.game?.name ?? 'L').slice(0, 2)}</span>}<b>{group.game?.name ?? '—'}</b></div>
      <div className="tenant-result-sessions">{group.draws.map((draw: Row) => {
        const keys = (draw.result?.winningKeys ?? []).map((key: unknown) => String(key).split('@')[0]);
        const detail = describeDraw(draw, language).split(' · ').slice(1).join(' · ');
        return <div className="tenant-result-session" key={draw.id}><div className="tenant-result-session-label"><b>{detail || drawSessionLabel(draw, language)}</b><small>{draw.drawNumber}</small></div><div className="tenant-result-balls">{keys.length ? keys.map((key: string, ball: number) => <strong className={`result-ball ball-${ball % 3}`} key={`${key}-${ball}`}>{key}</strong>) : <span className="tenant-result-empty">—</span>}</div></div>;
      })}</div>
    </article>)}{!rows.length && <p className="empty">{t('table.empty')}</p>}</div>
  </section>;
}
