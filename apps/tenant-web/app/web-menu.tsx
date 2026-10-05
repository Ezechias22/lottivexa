'use client';
import {useEffect,useRef,useState} from 'react';

type Item={id:string;label:string};

export default function WebMenu(){
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState<Item[]>([]);
  const targets=useRef(new Map<string,HTMLElement>());

  useEffect(()=>{
    document.body.classList.add('web-menu-enabled');
    const collect=()=>{
const nodes=[...document.querySelectorAll<HTMLElement>('.shell > aside:not(.web-menu-panel) button, .content > header button.secondary, .pos > nav button, .pos > header button.secondary')];
      const next:Item[]=[];
      const seen=new Set<string>();
      targets.current.clear();
      nodes.forEach((node,index)=>{
        const label=(node.textContent??'').replace(/\s+/g,' ').trim();
        if(!label||/reload|recharge|rafrechi|↻/i.test(label)||seen.has(label))return;
        const id=`web-menu-source-${index}`;
        seen.add(label);
        targets.current.set(id,node);
        node.dataset.webMenuId=id;
        next.push({id,label});
      });
      setItems(next);
    };
    collect();
    const observer=new MutationObserver(collect);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();document.body.classList.remove('web-menu-enabled');targets.current.clear()};
  },[]);

  const activate=(item:Item)=>{
    targets.current.get(item.id)?.click();
    setOpen(false);
  };

  const chooseLanguage=(index:number)=>{
    const options=()=>[...document.querySelectorAll<HTMLElement>('.lottivexa-language-switcher .languageMenu button, .lottivexa-language-switcher > button:not(.languageToggle)')];
    const direct=options()[index];
    if(direct) direct.click();
    else { document.querySelector<HTMLElement>('.lottivexa-language-switcher .languageToggle')?.click(); window.setTimeout(()=>options()[index]?.click(),0); }
    setOpen(false);
  };

  return <><button type="button" className="web-menu-toggle" aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>☰</button>{open&&<><button type="button" className="web-menu-backdrop" aria-label="Fèmen meni" onClick={()=>setOpen(false)}/><aside className="web-menu-panel" aria-label="Navigasyon"><div className="web-menu-title" style={{display:"flex",alignItems:"center",gap:10}}><img src="/lottivexa-brand-mark-192.png" width="32" height="32" alt=""/><span>LOTTIVEXA</span></div><div className="web-menu-scroll">{items.map(item=><button type="button" key={item.id} onClick={()=>activate(item)}>{item.label}</button>)}<button type="button" onClick={()=>chooseLanguage(0)}>Kreyòl</button><button type="button" onClick={()=>chooseLanguage(1)}>Français</button></div></aside></>}</>;
}
