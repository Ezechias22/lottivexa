import { describe, expect, it } from 'vitest';
import { buildTicketSalePayload } from './ticket-sale';

const line = (drawId: string, selection: string) => ({ drawId, betTypeId: 'bolet', selection, stake: '5' });

describe('merchant POS ticket draw grouping', () => {
  it('keeps the existing single-draw ticket API shape', () => {
    expect(buildTicketSalePayload([line('draw-1', '01')], 'draw-1', 'sale-1')).toEqual({
      deviceId: undefined,
      idempotencyKey: 'sale-1',
      drawId: 'draw-1',
      lines: [{ betTypeId: 'bolet', selection: ['01'], stake: '5', resultPosition: undefined }],
    });
  });

  it('sends different lines under their selected draws for one multi-draw ticket', () => {
    expect(buildTicketSalePayload([line('draw-1', '01'), line('draw-2', '02')], 'draw-2', 'sale-2')).toMatchObject({
      idempotencyKey: 'sale-2',
      draws: [
        { drawId: 'draw-1', lines: [{ selection: ['01'] }] },
        { drawId: 'draw-2', lines: [{ selection: ['02'] }] },
      ],
    });
  });

  it('puts the selected draw first so its game receives the free Maryaj lines', () => {
    expect(buildTicketSalePayload([line('draw-1', '01'), line('draw-2', '02')], 'draw-2', 'sale-3', undefined, [
      { selection: ['01', '02'] },
      { selection: ['01', '03'] },
    ])).toMatchObject({
      draws: [{ drawId: 'draw-2' }, { drawId: 'draw-1' }],
      freeMaryaj: [{ selection: ['01', '02'] }, { selection: ['01', '03'] }],
    });
  });

  it('rejects a ticket line without a selected draw', () => {
    expect(() => buildTicketSalePayload([line('', '01')], '', 'sale-4')).toThrow('DRAW_REQUIRED');
  });
});
