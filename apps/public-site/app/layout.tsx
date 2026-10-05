import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './globals.css';
import './language.css';
import {LanguageSwitcher} from './language-switcher';
import WebMenu from './web-menu';

export const metadata:Metadata={
  title:'LOTTIVEXA — Platfòm operasyon lotri',
  description:'Jere lavant, tikè, rezilta, finans, branch ak machann sou yon sèl platfòm sekirize.',
  icons:{icon:[{url:'/lottivexa-brand-mark-192.png',sizes:'192x192',type:'image/png'},{url:'/lottivexa-brand-mark-512.png',sizes:'512x512',type:'image/png'}],apple:'/lottivexa-brand-mark-192.png'},
};
export default function Layout({children}:{children:ReactNode}){return <html lang="ht"><body><LanguageSwitcher/><WebMenu/>{children}</body></html>}
