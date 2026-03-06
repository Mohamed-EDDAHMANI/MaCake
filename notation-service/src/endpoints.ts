// List of endpoints and allowed roles for notation-service
// The gateway's AuthorizeMiddleware builds: /{rest}/{method} and matches against these patterns.
// user.role is lowercased before comparison, so roles here must be lowercase.
// Endpoints NOT listed here are allowed for any authenticated user (or public if in publicRoutes).
export const NOTATION_ENDPOINTS = [
  // ── Ratings ──
  {
    pattern: /^\/rating\/create\/post$/,
    roles: ['client'],
  },
  {
    pattern: /^\/rating\/delete\/[^\/]+\/delete$/,
    roles: ['admin'],
  },
  // ── Likes ── (any authenticated user can like)
  {
    pattern: /^\/like\/toggle\/post$/,
    roles: ['client', 'patissiere', 'livreur', 'admin', 'manager', 'super_admin'],
  },
  // ── Followers ──
  {
    pattern: /^\/follower\/toggle\/post$/,
    roles: ['client'],
  },
];
