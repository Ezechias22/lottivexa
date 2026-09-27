'use client';
import {useEffect,useState} from 'react';

type Item={id:string;label:string};
export default function WebMenu(){
  const [open,setOpen]=useState(false),[items,setItems]=useState<Item[]>([]);
  useEffect(()=>{document.body.classList.add('web-menu-enabled');const collect=()=>{const nodes=[...document.querySelectorAll<HTMLElement>('body aside button, body nav button, body header button.secondary')];const found:Item[]=[];nodes.forEach((node,index)=>{const label=(node.textContent??'').replace(/\s+/g,' ').trim();if(!label||/reload|recharge|rafrechi|↻/i.test(label))return;const id=`web-menu-${index}`;node.dataset.webMenuId=id;if(!found.some(x=>x.label===label))found.push({id,label});});setItems(found)};collect();const observer=new MutationObserver(collect);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.body.classList.remove('web-menu-enabled')}},[]);
  const activate=(item:Item)=>{document.querySelector<HTMLElement>(`[data-web-menu-id="${item.id}"]`)?.click();setOpen(false)};
  return <><button type="button" className="web-menu-toggle" aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>☰</button>{open&&<><button type="button" className="web-menu-backdrop" aria-label="Fèmen meni" onClick={()=>setOpen(false)}/><aside className="web-menu-panel" aria-label="Navigasyon"><div className="web-menu-title">LOTTIVEXA</div><div className="web-menu-scroll">{items.map(item=><button type="button" key={item.id} onClick={()=>activate(item)}>{item.label}</button>)}</div></aside></>}</>;
}
