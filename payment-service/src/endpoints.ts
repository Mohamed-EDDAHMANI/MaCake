export const PAYMENT_ENDPOINTS = [
  {
    pattern: /^\/payment\/create\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
  {
    pattern: /^\/payment\/delivery\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
  {
    pattern: /^\/payment\/confirm\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
  {
    pattern: /^\/payment\/delivery\/confirm\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
  {
    pattern: /^\/payement\/create\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
  {
    pattern: /^\/wallet\/intent\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
  {
    pattern: /^\/wallet\/topup\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
  {
    pattern: /^\/wallet\/confirm\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
  {
    pattern: /^\/wallet\/webhook\/post$/,
    roles: ['client', 'admin', 'patissiere', 'livreur'],
  },
];
