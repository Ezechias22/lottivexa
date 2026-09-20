'use client';

import { useState } from 'react';

export default function ManualMaryajDialog({ language, onClose, onAdd }: {
  language: 'ht' | 'fr';
  onClose: () => void;
  onAdd: (selection: string[], stake: string) => void;
}) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [stake, setStake] = useState('');
  const valid = /^[0-9]{2}$/.test(first) && /^[0-9]{2}$/.test(second) && first !== second && Number(stake) > 0;
  const fr = language === 'fr';
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auto-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-maryaj-title">
      <button type="button" className="dialog-close secondary" onClick={onClose} aria-label={fr ? 'Fermer' : 'Fèmen'}>×</button>
      <span className="eyebrow">{fr ? 'VENTE' : 'VANT'}</span>
      <h3 id="manual-maryaj-title">{fr ? 'Mariage payé manuel' : 'Maryaj peye manyèl'}</h3>
      <p>{fr ? 'Saisissez les deux numéros et la mise de ce Mariage.' : 'Antre de nimewo yo ak pri pou Maryaj sa a.'}</p>
      <div className="manual-maryaj-fields">
        <label>{fr ? 'Premier numéro' : 'Premye nimewo'}<input autoFocus inputMode="numeric" maxLength={2} value={first} onChange={(event) => setFirst(event.target.value.replace(/[^0-9]/g, ''))} /></label>
        <label>{fr ? 'Deuxième numéro' : 'Dezyèm nimewo'}<input inputMode="numeric" maxLength={2} value={second} onChange={(event) => setSecond(event.target.value.replace(/[^0-9]/g, ''))} /></label>
        <label>{fr ? 'Mise' : 'Pri'}<input type="number" min="0.01" step="0.01" value={stake} onChange={(event) => setStake(event.target.value)} /></label>
      </div>
      <div className="buttons dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>{fr ? 'Annuler' : 'Anile'}</button>
        <button type="button" disabled={!valid} onClick={() => onAdd([first, second], stake)}>{fr ? 'Ajouter' : 'Ajoute'}</button>
      </div>
    </section>
  </div>;
}
