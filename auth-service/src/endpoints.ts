// List of endpoints and allowed roles for auth-service (Regex based)
// Gateway compares user.role.toLowerCase() with these values.

export interface EndpointConfig {
  pattern: RegExp;
  roles: string[];
}

const ALL_AUTHENTICATED_ROLES = [
  'client',
  'patissiere',
  'livreur',
] as const;

export const AUTH_ENDPOINTS: EndpointConfig[] = [
  {
    pattern: /^\/auth\/login\/post$/,
    roles: [...ALL_AUTHENTICATED_ROLES],
  },
  {
    pattern: /^\/auth\/register\/post$/,
    roles: [...ALL_AUTHENTICATED_ROLES],
  },
  {
    pattern: /^\/auth\/logout\/post$/,
    roles: [...ALL_AUTHENTICATED_ROLES],
  },
  {
    pattern: /^\/auth\/refresh\/post$/,
    roles: [...ALL_AUTHENTICATED_ROLES],
  },
  {
    pattern: /^\/auth\/get-profile\/get$/,
    roles: [...ALL_AUTHENTICATED_ROLES],
  },
  {
    pattern: /^\/auth\/update-profile\/post$/,
    roles: [...ALL_AUTHENTICATED_ROLES],
  },
];
