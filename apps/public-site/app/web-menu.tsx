'use client';
import {useState} from 'react';

export default function WebMenu(){
  const[open,setOpen]=useState(false);
  const chooseLanguage=(index:number)=>{
    const buttons=[...document.querySelectorAll<HTMLElement>('.lottivexa-language-switcher .languageMenu button, .lottivexa-language-switcher > button:not(.languageToggle)')];
    const direct=buttons[index];
    if(direct) direct.click();
    else { document.querySelector<HTMLElement>('.lottivexa-language-switcher .languageToggle')?.click(); window.setTimeout(()=>buttons[index]?.click(),0); }
    setOpen(false);
  };
  return <><button type="button" className="web-menu-toggle" aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>☰</button>{open&&<><button type="button" className="web-menu-backdrop" aria-label="Fèmen meni" onClick={()=>setOpen(false)}/><aside className="web-menu-panel" aria-label="Navigasyon"><div className="web-menu-title">LOTTIVEXA</div><div className="web-menu-scroll">{[['Platfòm','#platform'],['Solisyon','#solutions'],['Plan','#plans'],['Rezilta','/results'],['Konekte','https://lottivexa-merchant-web.onrender.com/'],['Mande aksè','#contact']].map(([label,href])=><a href={href} key={label} onClick={()=>setOpen(false)}>{label}</a>)}<button type="button" onClick={()=>chooseLanguage(0)}>Kreyòl</button><button type="button" onClick={()=>chooseLanguage(1)}>Français</button></div></aside></>}</>;
}
