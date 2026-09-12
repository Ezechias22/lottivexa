import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './globals.css';
import './language.css';
import {LanguageSwitcher} from './language-switcher';

export const metadata:Metadata={
  title:'LOTTIVEXA — Platfòm operasyon lotri',
  description:'Jere lavant, tikè, rezilta, finans, branch ak machann sou yon sèl platfòm sekirize.',
  icons:{icon:'/icon.svg'},
};
export default function Layout({children}:{children:ReactNode}){return <html lang="ht"><body><LanguageSwitcher/>{children}</body></html>}
