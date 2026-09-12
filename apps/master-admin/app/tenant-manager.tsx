'use client';

import { FormEvent, useMemo, useState } from 'react';
import styles from './tenant-manager.module.css';

type Tenant = {
  id: string;
  slug: string;
  legalName: string;
  status: string;
  owners?: Array<{ username?: string; email?: string; phone?: string }>;
};

export default function TenantManager({tenants,request,reload}:{tenants:Tenant[];request:(path:string,init?:RequestInit)=>Promise<unknown>;reload:()=>Promise<void>}) {
  const [tenantId,setTenantId]=useState(tenants[0]?.id??'');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const tenant=useMemo(()=>tenants.find(item=>item.id===tenantId)??tenants[0],[tenantId,tenants]);
  if(!tenant)return null;
  const owner=tenant.owners?.[0]??{};
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');const form=new FormData(event.currentTarget),temporaryPassword=String(form.get('temporaryPassword')??''),body={slug:String(form.get('slug')),legalName:String(form.get('legalName')),ownerUsername:String(form.get('ownerUsername')),ownerEmail:String(form.get('ownerEmail')),ownerPhone:String(form.get('ownerPhone'))};try{await request(`/tenants/${tenant.id}`,{method:'PATCH',body:JSON.stringify(body)});if(temporaryPassword){if(temporaryPassword.length<12)throw new Error('Modpas la dwe gen omwen 12 karaktè.');await request(`/tenants/${tenant.id}/reset-owner-password`,{method:'POST',body:JSON.stringify({temporaryPassword})})}setMessage('Enfòmasyon tenant lan modifye avèk siksè.');await reload()}catch(error){setMessage(error instanceof Error?error.message:String(error))}finally{setBusy(false)}}
  return <section className={styles.panel}><header><div><span>JESYON KLIYAN</span><h2>Modifye yon tenant</h2><p>Chanje enfòmasyon biznis la ak kont Tenant Owner la.</p></div><span className={styles.status}>{tenant.status}</span></header><label className={styles.selector}>Tenant<select value={tenant.id} onChange={event=>setTenantId(event.target.value)}>{tenants.map(item=><option key={item.id} value={item.id}>{item.legalName} — {item.slug}</option>)}</select></label><form key={tenant.id} className={styles.form} onSubmit={save}><label>Slug<input name="slug" defaultValue={tenant.slug} pattern="[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?" required/></label><label>Non legal<input name="legalName" defaultValue={tenant.legalName} required/></label><label>Username owner<input name="ownerUsername" defaultValue={owner.username??''} required/></label><label>Imèl owner<input name="ownerEmail" type="email" defaultValue={owner.email??''}/></label><label>Telefòn owner<input name="ownerPhone" defaultValue={owner.phone??''}/></label><label>Nouvo modpas tanporè<input name="temporaryPassword" type="password" minLength={12} placeholder="Kite vid si li pa chanje"/></label><button disabled={busy}>{busy?'Ap anrejistre…':'Anrejistre chanjman yo'}</button></form>{message&&<p className={styles.message} role="status">{message}</p>}</section>
}
