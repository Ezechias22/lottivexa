type ResultCheckEvent = {
  type?: unknown;
  metadata?: unknown;
};

export function hasCurrentResultCheck(
  events: readonly ResultCheckEvent[],
  drawId: string,
  publishedAt: Date | null,
): boolean {
  const version = publishedAt?.toISOString() ?? null;

  return events.some(event => {
    if (event.type !== 'RESULT_CHECKED' || !event.metadata || typeof event.metadata !== 'object') return false;
    const metadata = event.metadata as Record<string, unknown>;
    const checkedDrawVersions = metadata.checkedDrawVersions;
    if (!Array.isArray(checkedDrawVersions)) return false;

    return checkedDrawVersions.some(value => {
      if (!value || typeof value !== 'object') return false;
      const checked = value as Record<string, unknown>;
      return checked.drawId === drawId && checked.publishedAt === version;
    });
  });
}
