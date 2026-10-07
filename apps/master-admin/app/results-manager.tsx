'use client';
import {useState} from 'react';

type Props={draws:any[];request:(path:string,init?:RequestInit)=>Promise<any>;reload:()=>void};

export default function ResultsManager({draws,request,reload}:Props){
  const [keys,setKeys]=useState('');
  const [busy,setBusy]=useState('');
  async function save(draw:any){
    const winningKeys=(keys||((draw.result?.winningKeys??[]) as string[]).join(',')).split(',').map(x=>x.trim()).filter(Boolean);
    if(!winningKeys.length){alert('Add at least one winning number.');return}
    setBusy(draw.id);
    try{
      const path=draw.status==='RESULT_PUBLISHED'?`/results/master/draws/${draw.id}`:`/results/master/draws/${draw.id}/publish`;
      await request(path,{method:draw.status==='RESULT_PUBLISHED'?'PATCH':'POST',body:JSON.stringify({winningKeys})});
      setKeys('');reload();
    }catch(error){alert(error instanceof Error?error.message:'Could not save result');}
    finally{setBusy('');}
  }
  const published=draws.filter(draw=>draw.status==='RESULT_PUBLISHED');
  return <section className="panel master-results-manager">
    <div className="master-results-overview"><div className="master-results-heading"><div><small>LIVE RESULTS</small><h2>Published results</h2></div><span>{published.length}</span></div><div className="master-results-list">{published.map(draw=><article className="master-result-card" key={`published-${draw.id}`}><div className="master-result-brand">{draw.game?.logoUrl?<img src={draw.game.logoUrl} alt=""/>:<span>{String(draw.game?.code??draw.game?.name??'L').slice(0,2)}</span>}<b>{draw.game?.name??'—'}</b><small>{draw.tenant?.legalName??draw.tenant?.slug??'—'}</small></div><div className="master-result-row"><div><strong>{draw.drawNumber}</strong><small>{new Date(draw.publishedAt??draw.drawDate).toLocaleString()}</small></div><div className="master-result-balls">{(draw.result?.winningKeys??[]).map((key:string,index:number)=><b className={`ball-${index%3}`} key={`${draw.id}-${index}`}>{String(key).split('@')[0]}</b>)}</div></div></article>)}</div>{!published.length&&<p className="muted">No results published yet.</p>}</div>
    <h2>Manual draw results</h2>
    <p className="muted">Publish results for closed draws, or correct an unpublished payout calculation.</p>
    <div className="table-wrap"><table className="table"><thead><tr><th>Tenant</th><th>Lottery</th><th>Draw</th><th>Status</th><th>Winning numbers</th><th>Action</th></tr></thead><tbody>
      {draws.map(draw=><tr key={draw.id}><td>{draw.tenant?.legalName??draw.tenant?.slug??'—'}</td><td>{draw.game?.name??'—'}</td><td>{draw.drawNumber}</td><td>{draw.status}</td><td><input onChange={e=>setKeys(e.target.value)} defaultValue={Array.isArray(draw.result?.winningKeys)?draw.result.winningKeys.join(', '):''} placeholder="12, 34, 56" /></td><td><button disabled={busy===draw.id} onClick={()=>void save(draw)}>{draw.status==='RESULT_PUBLISHED'?'Update':'Publish'}</button></td></tr>)}
    </tbody></table></div>
    {!draws.length&&<p className="muted">No closed draws need results.</p>}
  </section>;
}
