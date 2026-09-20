'use client';

type Ticket = Record<string,any>;
const amount=(value:unknown)=>new Intl.NumberFormat('fr-HT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value??0));

export default function PrintReceipt({ticket,businessName,branchName}:{ticket:Ticket|null;businessName:string;branchName?:string}){
  if(!ticket)return null;
  const date=ticket.createdAt?new Date(ticket.createdAt):null;
  return <article className="print-receipt" aria-hidden="true">
    <header><p className="receipt-eyebrow">FICH BOLET</p><h1>{businessName||'Bolet'}</h1>{branchName&&<div>Biwo: {branchName}</div>}</header>
    <div className="receipt-meta"><span>Dat: {date&&!Number.isNaN(date.getTime())?date.toLocaleString('fr-HT'):'—'}</span><span>Tikè: <strong>{ticket.ticketNumber}</strong></span></div>
    <div className="receipt-draw">{ticket.draw?.game?.name??ticket.game?.name??'Lotri'}<br/>{ticket.draw?.drawNumber??''}</div>
    <div className="receipt-table"><div className="receipt-row receipt-heading"><span>Jwèt / nimewo</span><span>Montan</span></div>
      {(ticket.lines??[]).map((line:Ticket,index:number)=><div className="receipt-row" key={line.id??index}><span>{line.betType?.name??'Bolet'} <strong>{String(line.selectionKey??'').replaceAll('-', ' × ')}</strong></span><span>$ {amount(line.stake)}</span></div>)}
    </div>
    <div className="receipt-total"><span>TOTAL</span><strong>$ {amount(ticket.amount)}</strong></div>
    <footer>Kenbe tikè sa a pou verifye rezilta ou. Jwe ak responsabilite.</footer>
  </article>;
}
