import {beforeEach, describe, expect, it, vi} from 'vitest';

const database = vi.hoisted(() => ({
  draw: {findUnique: vi.fn(), findMany: vi.fn()},
  game: {findMany: vi.fn()},
}));

vi.mock('@lottivexa/database', () => ({
  prisma: database,
  Prisma: {TransactionIsolationLevel: {Serializable: 'Serializable'}},
}));

import {ResultsService} from './results.service';

const principal = {sub: 'platform-admin', tenantId: null, permissions: ['settings.edit'], platform: true, tokenVersion: 1};

describe('ResultsService platform-wide publishing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes one selected schedule to every matching closed tenant draw', async () => {
    database.draw.findUnique.mockResolvedValue({
      id: 'draw-a', tenantId: 'tenant-a', drawNumber: 'FL-20261006-2145',
      game: {id: 'game-a', code: 'FL', catalogCode: 'US-FL'},
    });
    database.game.findMany.mockResolvedValue([{id: 'game-a'}, {id: 'game-b'}, {id: 'game-c'}]);
    database.draw.findMany.mockResolvedValue([
      {id: 'draw-a', tenantId: 'tenant-a', status: 'CLOSED', result: null},
      {id: 'draw-b', tenantId: 'tenant-b', status: 'RESULT_PENDING', result: null},
      {id: 'draw-c', tenantId: 'tenant-c', status: 'RESULT_PUBLISHED', result: {winningKeys: ['12', '34']}},
    ]);

    const service = new ResultsService();
    const publish = vi.spyOn(service, 'publish').mockResolvedValue({drawId: 'draw-a', ticketsProcessed: 4, winners: 2});
    const outcome = await service.publishPlatform(principal, 'draw-a', {winningKeys: ['12', '34']});

    expect(database.game.findMany).toHaveBeenCalledWith({where: {catalogCode: 'US-FL'}, select: {id: true}});
    expect(database.draw.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({gameId: {in: ['game-a', 'game-b', 'game-c']}, drawNumber: {endsWith: '20261006-2145'}}),
    }));
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenNthCalledWith(1, {...principal, tenantId: 'tenant-a'}, 'draw-a', {winningKeys: ['12', '34']});
    expect(publish).toHaveBeenNthCalledWith(2, {...principal, tenantId: 'tenant-b'}, 'draw-b', {winningKeys: ['12', '34']});
    expect(outcome).toEqual({drawId: 'draw-a', drawsProcessed: 2, ticketsProcessed: 8, winners: 4, alreadyPublished: false});
  });

  it('refuses a global publish when a tenant already has a different result', async () => {
    database.draw.findUnique.mockResolvedValue({
      id: 'draw-a', tenantId: 'tenant-a', drawNumber: 'FL-20261006-2145',
      game: {id: 'game-a', code: 'FL', catalogCode: 'US-FL'},
    });
    database.game.findMany.mockResolvedValue([{id: 'game-a'}, {id: 'game-b'}]);
    database.draw.findMany.mockResolvedValue([
      {id: 'draw-a', tenantId: 'tenant-a', status: 'CLOSED', result: null},
      {id: 'draw-b', tenantId: 'tenant-b', status: 'RESULT_PUBLISHED', result: {winningKeys: ['99']}},
    ]);
    const service = new ResultsService();
    const publish = vi.spyOn(service, 'publish');

    await expect(service.publishPlatform(principal, 'draw-a', {winningKeys: ['12']}))
      .rejects.toThrow('DRAW_RESULT_ALREADY_PUBLISHED_DIFFERENTLY');
    expect(publish).not.toHaveBeenCalled();
  });

  it('keeps a custom lottery without a catalog mapping inside its own tenant', async () => {
    database.draw.findUnique.mockResolvedValue({
      id: 'draw-custom', tenantId: 'tenant-a', drawNumber: 'CUSTOM-20261006-2145',
      game: {id: 'game-custom', code: 'CUSTOM', catalogCode: null},
    });
    database.game.findMany.mockResolvedValue([{id: 'game-custom'}]);
    database.draw.findMany.mockResolvedValue([
      {id: 'draw-custom', tenantId: 'tenant-a', status: 'CLOSED', result: null},
    ]);
    const service = new ResultsService();
    const publish = vi.spyOn(service, 'publish').mockResolvedValue({drawId: 'draw-custom', ticketsProcessed: 1, winners: 0});

    await service.publishPlatform(principal, 'draw-custom', {winningKeys: ['12']});

    expect(database.game.findMany).toHaveBeenCalledWith({where: {id: 'game-custom'}, select: {id: true}});
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith({...principal, tenantId: 'tenant-a'}, 'draw-custom', {winningKeys: ['12']});
  });
});
