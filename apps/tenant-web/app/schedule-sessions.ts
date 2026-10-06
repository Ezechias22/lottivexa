type Row = Record<string, any>;

export type ScheduleSession = {
  gameId: string;
  gameName: string;
  gameCode: string;
  resultAt: string;
  schedules: Row[];
};

export function groupSchedulesBySession(games: Row[]): ScheduleSession[] {
  const sessions = new Map<string, ScheduleSession>();

  for (const game of games) {
    for (const schedule of game.schedules ?? []) {
      const resultAt = String(schedule.resultAt ?? "").slice(0, 5);
      const key = `${game.id}|${resultAt}`;
      const session = sessions.get(key) ?? {
        gameId: String(game.id),
        gameName: String(game.name ?? ""),
        gameCode: String(game.code ?? ""),
        resultAt,
        schedules: [],
      };
      session.schedules.push(schedule);
      sessions.set(key, session);
    }
  }

  return [...sessions.values()].sort(
    (left, right) => left.gameName.localeCompare(right.gameName) || left.resultAt.localeCompare(right.resultAt),
  );
}

export function isScheduleSessionOpen(session: ScheduleSession): boolean {
  return session.schedules.some((schedule) => schedule.active === true);
}
