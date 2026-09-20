'use client';

import { useState } from 'react';

export default function FreeMaryajDialog({ language, onClose, onAdd }: {
  language: 'ht' | 'fr';
  onClose: () => void;
  onAdd: (lines: { selection: string[] }[]) => void;
}) {
  const [numbers, setNumbers] = useState(['', '', '', '']);
  const valid = numbers.every((value) => /^\d{2}$/.test(value)) && numbers[0] !== numbers[1] && numbers[2] !== numbers[3];
  const fr = language === 'fr';
  const update = (index: number, value: string) => setNumbers((current) => current.map((number, i) => i === index ? value.replace(/\D/g, '').slice(0, 2) : number));
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auto-dialog" role="dialog" aria-modal="true" aria-labelledby="free-maryaj-title">
      <button type="button" className="dialog-close secondary" onClick={onClose} aria-label={fr ? 'Fermer' : 'Fèmen'}>×</button>
      <span className="eyebrow">{fr ? 'BONUS DE VENTE' : 'BONIS SOU VANT LAN'}</span>
      <h3 id="free-maryaj-title">{fr ? '2 Mariages gratuits' : '2 Maryaj gratis'}</h3>
      <p>{fr ? 'Cette vente atteint 100 $. Choisissez les numéros des deux lignes offertes.' : 'Vant sa a rive 100 $. Chwazi nimewo pou de liy Maryaj gratis yo.'}</p>
      <div className="manual-maryaj-fields">
        {numbers.map((number, index) => <label key={index}>{(fr ? 'Mariage ' : 'Maryaj ') + (index < 2 ? '1' : '2') + ' · ' + (index % 2 === 0 ? (fr ? '1er numéro' : 'Premye nimewo') : (fr ? '2e numéro' : 'Dezyèm nimewo'))}
          <input autoFocus={index === 0} inputMode="numeric" maxLength={2} value={number} onChange={(event) => update(index, event.target.value)} />
        </label>)}
      </div>
      <div className="buttons dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>{fr ? 'Annuler' : 'Anile'}</button>
        <button type="button" disabled={!valid} onClick={() => onAdd([{ selection: [numbers[0], numbers[1]] }, { selection: [numbers[2], numbers[3]] }])}>{fr ? 'Continuer' : 'Kontinye'}</button>
      </div>
    </section>
  </div>;
}
