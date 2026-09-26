'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { drawLabel } from './draw-label';
import { useMerchantLanguage } from './language-switcher';

type Row = Record<string, any>;
type Request = (path: string, init?: RequestInit) => Promise<any>;
const zone = 'America/Port-au-Prince';

function dayInHaiti(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  const part = (key: string) => parts.find((item) => item.type === key)?.value ?? '00';
  return part('year') + '-' + part('month') + '-' + part('day');
}
function shiftDay(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
function money(value: unknown, currency: string) {
  return '$' + new Intl.NumberFormat('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0));
}
function displayDay(value: string, language: 'ht' | 'fr') {
  const date = new Date(value + 'T12:00:00Z');
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'fr-HT', { timeZone: zone, day: '2-digit', month: '2-digit' }).format(date);
}

export default function MerchantReports({ request }: { request: Request }) {
  const { t, language } = useMerchantLanguage();
  const today = useMemo(() => dayInHaiti(), []);
  const [from, setFrom] = useState(() => shiftDay(today, -6));
  const [to, setTo] = useState(today);
  const [sales, setSales] = useState<Row | null>(null);
  const [draws, setDraws] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (start = from, end = to) => {
    if (start > end) { setError(t('invalidDateRange')); return; }
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ from: start, to: end }).toString();
      const values = await Promise.all([request('/reports/sales?' + query), request('/reports/draws?' + query)]);
      setSales(values[0]);
      setDraws(values[1]?.byDraw ?? []);
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
    } finally { setLoading(false); }
  }, [from, to, request, t]);

  useEffect(() => { void load(shiftDay(today, -6), today); }, [load, today]);
  const choosePeriod = (days: number) => {
    const start = shiftDay(dayInHaiti(), -(days - 1));
    const end = dayInHaiti();
    setFrom(start); setTo(end); void load(start, end);
  };

  async function exportPdf() {
    try {
      const query = new URLSearchParams({ from, to }).toString();
      const response = await request('/reports/sales.pdf?' + query);
      if (response instanceof Blob) {
        const url = URL.createObjectURL(response), link = document.createElement('a');
        link.href = url; link.download = 'lottivexa-sales-' + from + '-' + to + '.pdf'; link.click(); URL.revokeObjectURL(url);
      } else setError(t('reportExportError'));
    } catch (value) { setError(value instanceof Error ? value.message : String(value)); }
  }

  const currency = sales?.currency ?? 'USD';
  const daily: Row[] = sales?.byDay ?? [];
  const dailyByDate = new Map(daily.map((row) => [row.day, row]));
  const span = Math.max(1, Math.min(366, Math.floor((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1));
  const chartStart = shiftDay(to, -(span - 1));
  const chartDaily: Row[] = [];
  for (let day = chartStart; day <= to; day = shiftDay(day, 1)) chartDaily.push(dailyByDate.get(day) ?? { day, amount: 0, count: 0 });
  const maxSales = Math.max(1, ...chartDaily.map((row) => Number(row.amount ?? 0)));
  const net = Number(sales?.tickets?.sales ?? 0) - Number(sales?.payouts?.amount ?? 0);
  const accounting = sales?.accounting ?? {};
  const biggestWins: Row[] = sales?.biggestWins ?? [];

  return <section className="merchant-reports">
    <div className="reports-heading"><div><span className="eyebrow">{t('reports')}</span><h2>{t('reportSummary')}</h2></div><button className="secondary" onClick={() => void load()}>{t('reload')}</button></div>
    <section className="report-filter panel">
      <div className="date-fields">
        <label>{t('from')}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>{t('to')}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <button onClick={() => void load()} disabled={loading}>{t('showReport')}</button>
        <button className="secondary" onClick={() => void exportPdf()}>{t('downloadPdf')}</button>
      </div>
      <div className="period-buttons">
        <button className={from === today && to === today ? 'active' : 'secondary'} onClick={() => choosePeriod(1)}>{t('today')}</button>
        <button className="secondary" onClick={() => choosePeriod(7)}>{t('last7Days')}</button>
        <button className="secondary" onClick={() => choosePeriod(30)}>{t('last30Days')}</button>
      </div>
    </section>
    {loading && <div className="report-loading">{t('loading')}</div>}
    {error && <p className="message">{error}</p>}
    {sales && <>
      <div className="report-kpis">
        <article className="kpi-sales"><span>{t('totalSales')}</span><strong>{money(sales.tickets?.sales, currency)}</strong><small>{t('periodSales')}</small></article>
        <article><span>{t('tickets')}</span><strong>{sales.tickets?.count ?? 0}</strong><small>{t('ticketsInPeriod')}</small></article>
        <article><span>{t('payouts')}</span><strong>{money(sales.payouts?.amount, currency)}</strong><small>{sales.payouts?.count ?? 0} {t('winnersPaid')}</small></article>
        <article><span>{t('commission')}</span><strong>{money(sales.commission, currency)}</strong><small>{t('netSales')}: {money(net, currency)}</small></article>
        <article><span>{language === 'fr' ? 'Net système' : 'Nèt sistèm'}</span><strong>{money(accounting.netSales ?? net, currency)}</strong><small>{language === 'fr' ? 'Après paiements et commissions' : 'Apre peman ak komisyon'}</small></article>
        <article><span>{language === 'fr' ? 'Annulés / supprimés' : 'Anile / siprime'}</span><strong>{accounting.cancelledCount ?? 0}</strong><small>{money(accounting.cancelledAmount, currency)} retiré</small></article>
        <article><span>{language === 'fr' ? 'Déficit' : 'Defisi'}</span><strong>{money(accounting.deficit, currency)}</strong><small>{language === 'fr' ? 'À couvrir par la caisse' : 'Pou kouvri nan kès la'}</small></article>
      </div>
      <div className="reports-grid">
        <section className="panel sales-chart"><h3>{t('salesPerDay')}</h3>
          {daily.length ? <div className="bar-chart" role="img" aria-label={t('salesPerDay')}>
            {chartDaily.map((row) => <div className="bar-column" key={row.day} title={money(row.amount, currency)}>
              <span className="bar-value">{money(row.amount, currency)}</span>
              <div className="bar" style={{ height: Math.max(6, Number(row.amount ?? 0) * 100 / maxSales) + '%' }} />
              <small>{displayDay(row.day, language)}</small>
            </div>)}
          </div> : <p className="empty">{t('noSalesInPeriod')}</p>}
        </section>
        <section className="panel game-sales"><h3>{t('salesByLottery')}</h3>
          {(sales.byGame ?? []).length ? (sales.byGame as Row[]).map((row, index) => {
            const total = Number(sales.tickets?.sales ?? 0), share = total > 0 ? Number(row.amount ?? 0) * 100 / total : 0;
            return <div className="game-sale" key={row.gameId}><i className={'game-dot dot-' + (index % 5)} /><div><b>{row.gameName}</b><small>{row.count} {t('tickets')}</small><div className="share-track"><span style={{ width: share + '%' }} /></div></div><strong>{money(row.amount, currency)}</strong></div>;
          }) : <p className="empty">{t('noSalesInPeriod')}</p>}
        </section>
        <section className="panel draw-sales"><h3>{t('salesByDraw')}</h3>
          <div className="table-wrap"><table><thead><tr><th>{t('lottery')}</th><th>{t('draw')}</th><th>{t('tickets')}</th><th>{t('sales')}</th></tr></thead>
            <tbody>{draws.length ? draws.map((row) => <tr key={row.drawId}><td>{row.gameName}</td><td>{drawLabel({ game: { name: row.gameName }, drawNumber: row.drawNumber, drawDate: row.drawDate, resultAt: row.drawTime, session: row.session }, language)}</td><td>{row.count}</td><td>{money(row.amount, currency)}</td></tr>) : <tr><td colSpan={4} className="empty">{t('noSalesInPeriod')}</td></tr>}</tbody>
          </table></div>
        </section>
        <section className="panel biggest-wins"><h3>{t('biggestWins')}</h3>
          {biggestWins.length ? biggestWins.map((row) => <article key={row.ticketNumber}>
            <div><b>{row.ticketNumber}</b><small>{row.gameName} · {drawLabel({ game: { name: row.gameName }, drawNumber: row.drawNumber, session: row.session }, language)}</small>
              {(row.lines ?? []).map((line: Row, index: number) => <small key={index}>{line.betName}: {String(line.selectionKey).split('@')[0].replaceAll('-', ' × ')}{line.winCount > 1 ? ' · DEKABÈS ×' + line.winCount : ''}{line.isPromotional ? ' · ' + t('free') : ''}</small>)}
            </div><strong>{money(row.amount, currency)}</strong>
          </article>) : <p className="empty">{t('noWinnersInPeriod')}</p>}
        </section>
      </div>
    </>}
  </section>;
}
