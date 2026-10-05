import './language.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LanguageSwitcher } from './language-switcher';
import WebMenu from './web-menu';
import PwaRegister from './pwa-register';

export const metadata: Metadata = {
  title: 'LOTTIVEXA — Point de vente',
  description: 'Point de vente pour votre entreprise',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  appleWebApp: { capable: true, title: 'LOTTIVEXA', statusBarStyle: 'default' },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ht">
      <body>
        <PwaRegister />
        <LanguageSwitcher><WebMenu />{children}</LanguageSwitcher>
      </body>
    </html>
  );
}
