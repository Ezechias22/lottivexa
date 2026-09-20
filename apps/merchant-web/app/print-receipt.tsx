'use client';

import {statusLabel,useMerchantLanguage} from './language-switcher';
import {drawLabel} from './draw-label';

type Ticket = Record<string,any>;
const amount=(value:unknown)=>new Intl.NumberFormat('fr-HT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value??0));
const safeDate=(value:unknown,language:'ht'|'fr')=>{const date=value?new Date(String(value)):null;return date&&!Number.isNaN(date.getTime())?date.toLocaleString(language==='fr'?'fr-FR':'fr-HT',{timeZone:'America/Port-au-Prince',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'};

export default function PrintReceipt({ticket,businessName,branchName}:{ticket:Ticket|null;businessName:string;branchName?:string}){
  const{language}=useMerchantLanguage();
  if(!ticket)return null;
  return <article className="print-receipt" aria-hidden="true" lang={language}>
    <header><p className="receipt-eyebrow">{language==='fr'?'TICKET DE LOTERIE':'TIKÈ BOLET'}</p><h1>{businessName||'Bolet'}</h1>{branchName&&<div className="receipt-branch">{language==='fr'?'Succursale':'Biwo'} : {branchName}</div>}</header>
    <div className="receipt-ticket"><span>{language==='fr'?'N° DU TICKET':'NIMEWO TIKÈ'}</span><strong>{ticket.ticketNumber??ticket.id}</strong><em>{statusLabel(String(ticket.status??'VALID'),language)}</em></div>
    <div className="receipt-draw"><span>{language==='fr'?'LOTERIE / TIRAGE':'LOTRI / TIRAJ'}</span><strong>{ticket.draw?drawLabel(ticket.draw,language):ticket.game?.name??ticket.gameName??'Lotri'}</strong></div>
    <div className="receipt-meta"><span>{language==='fr'?'Date':'Dat'}</span><strong>{safeDate(ticket.createdAt,language)}</strong></div>
    <div className="receipt-table"><div className="receipt-row receipt-heading"><span>{language==='fr'?'JEU / NUMÉRO':'JWÈT / NIMEWO'}</span><span>{language==='fr'?'MISE':'PRI'}</span></div>
      {(ticket.lines??[]).map((line:Ticket,index:number)=><div className="receipt-row" key={line.id??index}><span><small>{line.betType?.name??(language==='fr'?'Bolet':'Bolet')}</small><strong className="receipt-number">{String(line.selectionKey??'').replaceAll('-', ' × ').split('@')[0]}</strong>{String(line.selectionKey??'').includes('@')&&<small>{language==='fr'?'Position':'Opsyon'} {String(line.selectionKey).split('@').pop()}</small>}</span><strong className="receipt-stake">$ {amount(line.stake)}</strong></div>)}
    </div>
    <div className="receipt-total"><span>{language==='fr'?'TOTAL':'TOTAL'}</span><strong>$ {amount(ticket.amount)}</strong></div>
    <div className="receipt-potential"><span>{language==='fr'?'GAIN POTENTIEL':'GANY POSIB'}</span><strong>$ {amount(ticket.potentialWin)}</strong></div>
    <footer>{language==='fr'?'Conservez ce ticket original pour vérifier le résultat et réclamer un gain.':'Kenbe tikè orijinal sa a pou verifye rezilta a epi reklame gany ou.'}</footer>
  </article>;
}
