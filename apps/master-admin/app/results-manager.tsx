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
  return <section className="panel">
    <h2>Manual draw results</h2>
    <p className="muted">Publish results for closed draws, or correct an unpublished payout calculation.</p>
    <div className="table-wrap"><table className="table"><thead><tr><th>Tenant</th><th>Lottery</th><th>Draw</th><th>Status</th><th>Winning numbers</th><th>Action</th></tr></thead><tbody>
      {draws.map(draw=><tr key={draw.id}><td>{draw.tenant?.legalName??draw.tenant?.slug??'—'}</td><td>{draw.game?.name??'—'}</td><td>{draw.drawNumber}</td><td>{draw.status}</td><td><input onChange={e=>setKeys(e.target.value)} defaultValue={Array.isArray(draw.result?.winningKeys)?draw.result.winningKeys.join(', '):''} placeholder="12, 34, 56" /></td><td><button disabled={busy===draw.id} onClick={()=>void save(draw)}>{draw.status==='RESULT_PUBLISHED'?'Update':'Publish'}</button></td></tr>)}
    </tbody></table></div>
    {!draws.length&&<p className="muted">No closed draws need results.</p>}
  </section>;
}
