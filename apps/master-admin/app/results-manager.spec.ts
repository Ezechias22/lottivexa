import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const source = readFileSync(new URL('./results-manager.tsx', import.meta.url), 'utf8');

describe('master admin global result entry', () => {
  it('uses the compact French manual-entry form and only closed draws', () => {
    for (const text of [
      'Saisir un résultat manuellement',
      'Vérifiez que tous les tickets vendus hors ligne sont synchronisés avant de publier. La publication est définitive.',
      'Sélectionnez un tirage clôturé',
      'Numéros gagnants (dans l’ordre)',
      'Publier le résultat',
      "draw.status === 'CLOSED' || draw.status === 'RESULT_PENDING'",
    ]) expect(source).toContain(text);
    expect(source).not.toContain('master-results-overview');
    expect(source).not.toContain('table-wrap');
  });

  it('sends one result to the platform publishing endpoint', () => {
    expect(source).toContain('/results/master/draws/${encodeURIComponent(selected.id)}/publish');
    expect(source).toContain('drawsProcessed');
  });
});
