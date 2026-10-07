export function apiErrorCode(body: unknown, status: number): string {
  const root = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const nested = root.error && typeof root.error === 'object' ? root.error as Record<string, unknown> : {};
  const code = nested.code ?? root.code ?? nested.message ?? root.message;
  return typeof code === 'string' && code ? code : `HTTP_${status}`;
}
