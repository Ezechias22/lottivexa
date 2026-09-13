import'./language.css';import type{Metadata}from'next';import type{ReactNode}from'react';import{PwaRegister}from'./pwa-register';import{LanguageSwitcher}from'./language-switcher';import{LanguageProvider}from'./i18n';
export const metadata:Metadata={title:'Bolet',description:'Jesyon operasyon bolet',manifest:'/manifest.webmanifest',icons:{icon:'/icon.svg'},appleWebApp:{capable:true,title:'Bolet'}};
export default function Layout({children}:{children:ReactNode}){return <html lang="ht"><body><LanguageProvider><PwaRegister/><LanguageSwitcher/>{children}</LanguageProvider></body></html>}
