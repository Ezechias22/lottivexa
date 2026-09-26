'use client';

import {useState} from 'react';

export default function MenuButton(){
  const [open,setOpen]=useState(false);
  function language(value:'ht'|'fr'){
    localStorage.setItem('lottivexa-language',value);
    window.location.reload();
  }
  return <div className="site-menu" data-site-menu>
    <button type="button" className="site-menu-toggle" aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>☰</button>
    {open&&<div className="site-menu-panel">
      <button type="button" onClick={()=>language('ht')}>Kreyòl</button>
      <button type="button" onClick={()=>language('fr')}>Français</button>
      <a href="/results">Rezilta</a>
      <a href="#contact">Kontakte nou</a>
    </div>}
  </div>;
}
