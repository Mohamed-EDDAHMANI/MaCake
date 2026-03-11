
// Orders Service Message Patterns
export const ORDERS_PATTERNS = {
  ORDER_CREATE: 'orders/create-order',
  ORDER_FIND_ALL: 'orders/find-all',
  ORDER_FIND_PATISSIERE: 'orders/patissiere/find-all',
  ORDER_FIND_ONE: 'orders/find-one',
  ORDER_REMOVE: 'orders/remove',
  ORDER_ITEM_CREATE: 'orders/order-item/create',
  ORDER_ITEM_FIND_ALL: 'orders/order-item/find-all',
  ORDER_ITEM_FIND_ONE: 'orders/order-item/find-one',
  ORDER_ITEM_UPDATE: 'orders/order-item/update',
  ORDER_ITEM_REMOVE: 'orders/order-item/remove',
} as const;
