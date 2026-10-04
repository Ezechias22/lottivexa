'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState('');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
      setHelp('Aplikasyon an enstale.');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setHelp(ios
        ? 'Sou iPhone/iPad: peze Pataje, apre chwazi “Add to Home Screen”.'
        : 'Nan Chrome oswa Edge, ouvri meni ⋮ a epi chwazi “Install app” oswa “Install this site as an app”.');
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setHelp(choice.outcome === 'accepted' ? 'Aplikasyon an ap enstale.' : 'Ou ka enstale aplikasyon an nenpòt lè.');
    setPrompt(null);
  }

  if (installed) return null;
  return (
    <div className="install-app-control">
      <button type="button" onClick={() => void install()}>
        <span aria-hidden="true">⇩</span> Enstale aplikasyon machann nan
      </button>
      {help && <small role="status">{help}</small>}
    </div>
  );
}
