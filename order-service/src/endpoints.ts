// List of endpoints and allowed roles for orders-service (Regex based)
export const ORDERS_ENDPOINTS = [
  {
    pattern: /^\/order\/create$/, 
    roles: ['client', 'admin'],
  },
  {
    pattern: /^\/order\/accept\/.*$/,
    roles: ['patissiere', 'admin'],
  },
  {
    pattern: /^\/order\/complete\/.*$/,
    roles: ['patissiere', 'admin'],
  },
  {
    pattern: /^\/order\/delivered-by-client\/.*$/,
    roles: ['client', 'admin'],
  },
  {
    pattern: /^\/order\/start-delivery\/.*$/,
    roles: ['client', 'admin'],
  },
  {
    pattern: /^\/orders\/find-all$/,
    roles: ['client', 'patissiere', 'admin'],
  },
  {
    pattern: /^\/order\/find-one\/.*$/, // Matches /order/find-one/:id (delivery/livreur = same role)
    roles: ['client', 'patissiere', 'delivery', 'livreur', 'admin'],
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
  {
    pattern: /^\/estimation\/client$/,
    roles: ['client', 'admin'],
  },
  {
    pattern: /^\/estimation\/delivery$/,
    roles: ['delivery', 'livreur', 'admin'],
  },
  {
    pattern: /^\/estimation\/find-by-order\/.*$/,
    roles: ['client', 'patissiere', 'delivery', 'livreur', 'admin'],
  },
  {
    pattern: /^\/estimation\/find-pending-client$/,
    roles: ['delivery', 'livreur', 'admin'],
  },
  {
    pattern: /^\/estimation\/confirm\/.*$/,
    roles: ['delivery', 'livreur', 'admin'],
  },
  {
    pattern: /^\/estimation\/find-accepted-delivery$/,
    roles: ['delivery', 'livreur', 'admin'],
  },
  {
    pattern: /^\/estimation\/find-estimated-delivery$/,
    roles: ['delivery', 'livreur', 'admin'],
  },
  {
    pattern: /^\/estimation\/mark-paid\/.*$/,
    roles: ['client', 'admin'],
  },
  {
    pattern: /^\/estimation\/find-one\/.*$/,
    roles: ['client', 'delivery', 'livreur', 'admin'],
  },
];

