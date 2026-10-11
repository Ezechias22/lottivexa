'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { localResultDate, orderedPick3Pick4Result, orderedThreeDigitResult, publishedResultsForDate, resultKeysForDisplay } from './results-date';

type Row = Record<string, any>;
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const zone = 'America/Port-au-Prince';

function readableDraw(row: Row) {
  const french = typeof document !== 'undefined' && document.documentElement.lang === 'fr';
  const source = row.resultAt ?? row.closesAt ?? row.opensAt ?? row.drawDate;
  const date = source ? new Date(source) : null;
  const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
  const hour = validDate ? Number(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(validDate)) : null;
  const session = hour == null ? (french ? 'Séance à confirmer' : 'Sesyon pou verifye')
    : hour < 12 ? (french ? 'Matin' : 'Maten')
    : hour < 16 ? 'Midi'
    : hour < 21 ? (french ? 'Soir' : 'Swa')
    : (french ? 'Nuit' : 'Lannuit');
  const normal = french ? 'Normal' : 'Nòmal';
  const game = row.game?.name ?? (french ? 'Loterie' : 'Lotri');
  if (!validDate) return `${game} · ${normal} · ${session}`;
  const day = new Intl.DateTimeFormat(french ? 'fr-FR' : 'fr-HT', { timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(validDate);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(validDate);
  return `${game} · ${normal} · ${session} · ${day} ${time}`;
}

function visibleWinningResult(row: Row) {
  const keys = resultKeysForDisplay((row.result?.winningKeys ?? []).map((value: unknown) => String(value).split('@')[0]));
  const ranked = orderedPick3Pick4Result(keys);
  if (ranked) {
    const french = typeof document !== 'undefined' && document.documentElement.lang === 'fr';
    const labels = french ? ['1er', '2e', '3e'] : ['1ye lo', '2yèm lo', '3yèm lo'];
    return ranked.positions.map((value, index) => `${labels[index]}: ${value}`).join(' · ');
  }
  const positioned = orderedThreeDigitResult(keys);
  if (!positioned) return keys.join(' · ') || '—';
  const french = typeof document !== 'undefined' && document.documentElement.lang === 'fr';
  const labels = french ? ['1er', '2e', '3e', 'Complet'] : ['1ye', '2yèm', '3yèm', 'Konplè'];
  return `${labels[0]}: ${positioned.positions[0]} · ${labels[1]}: ${positioned.positions[1]} · ${labels[2]}: ${positioned.positions[2]} · ${labels[3]}: ${positioned.combined}`;
}

export default function Results() {
  const [tenant, setTenant] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState<Row>({ results: [] });
  const [error, setError] = useState('');
  async function load(slug = tenant, date = selectedDate) {
    if (!slug || !date) return;
    try {
      const response = await fetch(`${API}/results/public/${encodeURIComponent(slug)}?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'RESULTS_UNAVAILABLE');
      setData({ ...body, results: publishedResultsForDate(Array.isArray(body.results) ? body.results : [], date) }); setError('');
    } catch (value) { setError(value instanceof Error ? value.message : String(value)); }
  }
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get('tenant') ?? '';
    setTenant(slug);
  }, []);
  useEffect(() => {
    if (!selectedDate) setSelectedDate(localResultDate());
  }, [selectedDate]);
  useEffect(() => {
    if (!tenant || !selectedDate) return;
    void load(tenant, selectedDate);
    const timer = setInterval(() => void load(tenant, selectedDate), 15000);
    return () => clearInterval(timer);
  }, [tenant, selectedDate]);
  return <main style={{ fontFamily: 'system-ui', maxWidth: 1000, margin: 'auto', padding: 24 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><img src="/lottivexa-brand-mark-192.png" width="48" height="48" alt=""/><div><b>LOTTIVEXA</b><h1>{data.tenant?.businessName ?? 'Rezilta lotri'}</h1></div></div><span style={{ color: '#16803a' }}>● AN TAN REYÈL</span>
    </header>
    <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void load(tenant, selectedDate); }} style={{ display: 'flex', gap: 8, margin: '20px 0', flexWrap: 'wrap' }}>
      <input aria-label="Tenant" value={tenant} onChange={event => setTenant(event.target.value)} placeholder="non tenant lan" required style={{ padding: 12, flex: 1 }} />
      <label style={{ display: 'grid', gap: 4, color: '#344054', fontSize: 12, fontWeight: 700 }}>Dat rezilta<input aria-label="Dat rezilta" type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} style={{ padding: 12, border: '1px solid #d0d5dd', borderRadius: 8 }} /></label>
      <button style={{ padding: '12px 20px' }}>Afiche rezilta</button>
    </form>
    {error && <p>{error}</p>}
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
      {(data.results ?? []).map((row: Row) => <article key={row.id} style={{ border: '1px solid #ddd', borderRadius: 14, padding: 18 }}>
        <small>{row.game?.catalogCode}</small><h2>{row.game?.name}</h2>
        {row.game?.logoUrl && <img src={row.game.logoUrl} alt={`Logo ${row.game?.name ?? ''}`} style={{ height: 64, maxWidth: 180, objectFit: 'contain' }} />}
        <b>{readableDraw(row)}</b><p style={{ fontSize: 20, fontWeight: 900 }}>{visibleWinningResult(row)}</p>
        <time>{row.publishedAt ? new Date(row.publishedAt).toLocaleString() : '—'}</time>
      </article>)}
    </section>
    {!data.results?.length && !error && <p>Pa gen rezilta pibliye.</p>}
  </main>;
}
