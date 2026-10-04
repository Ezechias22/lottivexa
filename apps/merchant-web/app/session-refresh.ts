export type RefreshedSession = { accessToken: string; refreshToken: string };

type AppKind = "tenant" | "merchant";
type LockManagerLike = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

const inFlight = new Map<AppKind, Promise<RefreshedSession | null>>();

/** Rotate once for parallel API requests, and coordinate tabs with Web Locks. */
export function refreshWebSession(
  apiBase: string,
  app: AppKind,
  failedAccessToken: string,
  fallbackRefreshToken?: string,
): Promise<RefreshedSession | null> {
  const accessKey = `${app}_access`;
  const refreshKey = `${app}_refresh`;
  const execute = async (): Promise<RefreshedSession | null> => {
    const currentAccess = localStorage.getItem(accessKey) ?? "";
    const currentRefresh = localStorage.getItem(refreshKey) ?? fallbackRefreshToken ?? "";

    if (currentAccess && currentAccess !== failedAccessToken && currentRefresh) {
      return { accessToken: currentAccess, refreshToken: currentRefresh };
    }
    if (!currentRefresh) return null;

    const response = await fetch(`${apiBase.replace(/\/$/, "")}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefresh }),
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`SESSION_REFRESH_UNAVAILABLE_${response.status}`);

    const body = await response.json() as Partial<RefreshedSession>;
    if (typeof body.accessToken !== "string" || typeof body.refreshToken !== "string") {
      throw new Error("SESSION_REFRESH_INVALID_RESPONSE");
    }
    const next = { accessToken: body.accessToken, refreshToken: body.refreshToken };
    localStorage.setItem(accessKey, next.accessToken);
    localStorage.setItem(refreshKey, next.refreshToken);
    return next;
  };

  const locks = (navigator as Navigator & { locks?: LockManagerLike }).locks;
  if (locks) return locks.request<RefreshedSession | null>(`lottivexa-${app}-token-refresh`, execute);
  const active = inFlight.get(app);
  if (active) return active;
  const pending = execute().finally(() => inFlight.delete(app));
  inFlight.set(app, pending);
  return pending;
}
