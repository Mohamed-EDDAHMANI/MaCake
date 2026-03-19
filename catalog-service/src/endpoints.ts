// List of endpoints and allowed roles for catalog-service (Regex based)
// The gateway's AuthorizeMiddleware builds: /{rest}/{method} and matches against these patterns.
// user.role is lowercased before comparison, so roles here must be lowercase.
// Endpoints NOT listed here are allowed for any authenticated user (or public if in publicRoutes).
export const CATALOG_ENDPOINTS = [
  // ── Products ──
  {
    pattern: /^\/product\/create\/post$/,
    roles: ['patissiere', 'admin'],
  },
  {
    pattern: /^\/product\/update\/[^\/]+\/put$/,
    roles: ['patissiere', 'admin'],
  },
  {
    pattern: /^\/product\/delete\/[^\/]+\/delete$/,
    roles: ['patissiere', 'admin'],
  },
  // ── Categories ──
  {
    pattern: /^\/category\/create\/post$/,
    roles: ['admin'],
  },
  {
    pattern: /^\/category\/update\/[^\/]+\/put$/,
    roles: ['admin'],
  },
  {
    pattern: /^\/category\/remove\/[^\/]+\/delete$/,
    roles: ['admin'],
  },
];
