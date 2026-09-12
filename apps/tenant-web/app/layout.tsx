import'./language.css';import type{Metadata}from'next';import type{ReactNode}from'react';import{PwaRegister}from'./pwa-register';import{LanguageSwitcher}from'./language-switcher';
export const metadata:Metadata={title:'Lottivexa Tenant Console',description:'Lottery and bolet tenant operations',manifest:'/manifest.webmanifest',icons:{icon:'/icon.svg'},appleWebApp:{capable:true,title:'Lottivexa'}};
export default function Layout({children}:{children:ReactNode}){return <html lang="ht"><body><PwaRegister/><LanguageSwitcher/>{children}</body></html>}
