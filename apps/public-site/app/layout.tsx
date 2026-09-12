import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './globals.css';

export const metadata:Metadata={
  title:'LOTTIVEXA — Platfòm operasyon lotri',
  description:'Jere lavant, tikè, rezilta, finans, branch ak machann sou yon sèl platfòm sekirize.',
  icons:{icon:'/icon.svg'},
};
export default function Layout({children}:{children:ReactNode}){return <html lang="ht"><body>{children}</body></html>}
