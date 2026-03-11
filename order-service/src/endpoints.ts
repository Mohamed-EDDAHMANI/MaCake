// List of endpoints and allowed roles for orders-service (Regex based)
export const ORDERS_ENDPOINTS = [
  {
    pattern: /^\/order\/create$/, 
    roles: ['client', 'admin'],
  },
  {
    pattern: /^\/orders\/find-all$/,
    roles: ['client', 'patissiere', 'admin'],
  },
  {
    pattern: /^\/order\/find-one\/.*$/, // Matches /order/find-one/:id
    roles: ['client', 'patissiere', 'admin'],
  },
  {
    pattern: /^\/orders\/patissiere\/find-all$/,
    roles: ['patissiere', 'admin'],
  },
  {
    pattern: /^\/order\/update\/.*$/, // Matches /order/update/:id
    roles: ['admin'],
  },
  {
    pattern: /^\/order\/remove\/.*$/, // Matches /order/remove/:id
    roles: ['admin'],
  },
  {
    pattern: /^\/order-item\/create$/,
    roles: ['client', 'admin'],
  },
   {
    pattern: /^\/order-item\/find-all$/,
    roles: ['admin'],
  },
  {
    pattern: /^\/order-item\/find-one\/.*$/,
    roles: ['client', 'admin'],
  },
  {
    pattern: /^\/order-item\/update\/.*$/,
    roles: ['admin'],
  },
  {
    pattern: /^\/order-item\/remove\/.*$/,
    roles: ['admin'],
  },
];

