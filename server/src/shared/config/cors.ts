export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || origin === 'null') return true;
  if (origin.startsWith('file://')) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return origin === process.env.CLIENT_URL;
}
