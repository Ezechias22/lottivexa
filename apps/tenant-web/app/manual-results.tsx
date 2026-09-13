'use client';

import {useState, type FormEvent} from 'react';
import {useI18n} from './i18n';
import {describeDraw} from './draw-label';

type Draw = {id:string;drawNumber:string;status:string;drawDate?:string;resultAt?:string;game?:{name?:string};result?:{winningKeys?:string[]}};

export default function ManualResults({draws,request,reload}:{draws:Draw[];request:(path:string,init?:RequestInit)=>Promise<unknown>;reload:()=>Promise<void>}) {
  const {t,language} = useI18n();
  const eligible = draws.filter(draw => draw.status === 'CLOSED' || draw.status === 'RESULT_PENDING').sort((a,b)=>String(b.resultAt??'').localeCompare(String(a.resultAt??'')));
  const published = draws.filter(draw => draw.status === 'RESULT_PUBLISHED');
  const [drawId,setDrawId] = useState('');
  const [numbers,setNumbers] = useState('');
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const chosen = eligible.find(draw => draw.id === drawId);

  async function publish(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen || busy) return;
    const winningKeys = numbers.split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);
    if (!winningKeys.length || winningKeys.length > 20 || winningKeys.some(x=> !/^\d{1,5}$/.test(x))) {
      setNotice(t('result.invalid'));return;
    }
    if (!window.confirm(`${t('result.confirm')} ${describeDraw(chosen,language)}: ${winningKeys.join(', ')}? ${t('result.offline')}`)) return;
    setBusy(true);setNotice('');
    try {
      await request(`/results/draws/${encodeURIComponent(chosen.id)}/publish`,{method:'POST',body:JSON.stringify({winningKeys})});
      setNumbers('');setDrawId('');await reload();setNotice(t('result.success'));
    } catch(error) {setNotice(error instanceof Error?error.message:String(error));}
    finally {setBusy(false);}
  }
  return <section className="panel" id="manual-results">
    <h2>{t('result.title')}</h2>
    <p className="muted">{t('result.offline')}</p>
    <form className="form one" onSubmit={publish}>
      <label>{t('result.draw')}<select value={drawId} onChange={event=>setDrawId(event.target.value)} required><option value="">{t('result.choose')}</option>{eligible.map(draw=><option key={draw.id} value={draw.id}>{describeDraw(draw,language)}</option>)}</select></label>
      {chosen&&<p className="muted" role="status">{describeDraw(chosen,language)}</p>}
      <label>{t('result.numbers')}<input value={numbers} onChange={event=>setNumbers(event.target.value)} inputMode="numeric" placeholder="12, 34, 56" required /></label>
      <button type="submit" disabled={busy || !chosen}>{busy?t('result.wait'):t('result.publish')}</button>
    </form>
    {!eligible.length&&<p className="muted">{t('result.none')}</p>}
    {notice&&<p role="status" className="message">{notice}</p>}
    <h3>{t('result.history')}</h3>
    <div className="table-wrap"><table><thead><tr><th>{t('result.lottery')}</th><th>{t('result.draw')}</th><th>{t('result.numbers')}</th></tr></thead><tbody>{published.map(draw=><tr key={draw.id}><td>{draw.game?.name??'—'}</td><td>{describeDraw(draw,language)}</td><td>{draw.result?.winningKeys?.join(', ')??'—'}</td></tr>)}</tbody></table></div>
  </section>;
}
