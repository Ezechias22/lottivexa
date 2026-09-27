'use client';
import { useEffect, useState } from 'react';

export default function LotteryCatalogManager({ request }: { request: (path: string, init?: RequestInit) => Promise<any> }) {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  async function load() { setRows(await request('/master/lottery/catalog')); }
  useEffect(() => { void load().catch(e => setMessage(String(e))); }, []);
  async function save(row: any, logoUrl: string) {
    setBusy(row.catalogCode); setMessage('');
    try { await request(`/master/lottery/catalog/${encodeURIComponent(row.catalogCode)}`, { method: 'PATCH', body: JSON.stringify({ logoUrl }) }); await load(); setMessage(`Logo ${row.name} sove pou tout tenant yo.`); }
    catch (e) { setMessage(String(e)); } finally { setBusy(''); }
  }
  return <section className="panel lottery-catalog-manager"><h2>Logo lotri yo</h2><p>Master Admin sèlman jere logo katalog la. Chanjman an aplike sou tout tenant yo.</p>{message&&<p className="message">{message}</p>}<div className="catalog-grid">{rows.map(row=><form className="catalog-card" key={row.catalogCode} onSubmit={e=>{e.preventDefault();const value=String(new FormData(e.currentTarget).get('logoUrl')??'').trim();void save(row,value)}}><div><strong>{row.name}</strong><small>{row.catalogCode} · {row.status}</small></div><input name="logoUrl" type="url" defaultValue={row.logoUrl??''} placeholder="https://..."/><button disabled={busy===row.catalogCode}>{busy===row.catalogCode?'Ap sove…':'Sove logo'}</button></form>)}</div>{!rows.length&&!message&&<p>Pa gen katalog lotri ki enstale.</p>}</section>;
}
