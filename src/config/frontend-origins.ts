const DEFAULT_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function parseOriginList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Browser origins allowed for CORS and Socket.IO (credentials).
 * Merges FRONTEND_ORIGIN (comma-separated) with FRONTEND_ORIGIN_BUSINESS and FRONTEND_ORIGIN_CUSTOMER.
 * If nothing is configured, local Vite defaults are used.
 */
export function resolveFrontendOrigins(): string[] {
  const merged = [
    ...parseOriginList(process.env.FRONTEND_ORIGIN),
    ...parseOriginList(process.env.FRONTEND_ORIGIN_BUSINESS),
    ...parseOriginList(process.env.FRONTEND_ORIGIN_CUSTOMER),
  ];
  const unique = [...new Set(merged)];
  return unique.length > 0 ? unique : DEFAULT_DEV_ORIGINS;
}
