'use client';

import {useEffect, useState} from 'react';
import {useI18n} from './i18n';

export function LanguageSwitcher() {
  const {language, setLanguage, t} = useI18n();
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const base = raw.replace(/\/$/, '').endsWith('/api/v1') ? raw.replace(/\/$/, '') : raw.replace(/\/$/, '') + '/api/v1';
    async function warm(attempt = 0) {
      try {
        const response = await fetch(base + '/health', {cache: 'no-store'});
        if (!response.ok) throw new Error('NOT_READY');
        if (!cancelled) setWaking(false);
      } catch {
        if (!cancelled) {
          setWaking(true);
          if (attempt < 6) retry = setTimeout(() => void warm(attempt + 1), 10_000);
        }
      }
    }
    void warm();
    return () => {cancelled = true; if (retry) clearTimeout(retry);};
  }, []);

  return <>
    {waking && <div className="serverWake" role="status"><span className="wakeSpinner"/> {t('wake.loading')}</div>}
    <div className="languageSwitcher" role="group" aria-label="Lang / Langue">
      <button type="button" aria-pressed={language === 'ht'} className={language === 'ht' ? 'active' : ''} onClick={() => setLanguage('ht')}>Kreyòl</button>
      <button type="button" aria-pressed={language === 'fr'} className={language === 'fr' ? 'active' : ''} onClick={() => setLanguage('fr')}>Français</button>
    </div>
  </>;
}
