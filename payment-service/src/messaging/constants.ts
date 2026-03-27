// RabbitMQ Client Tokens
export const ORDERS_CLIENT = 'ORDERS_CLIENT';
export const AUTH_CLIENT = 'AUTH_CLIENT';

// Payment Service Message Patterns
export const PAYMENT_PATTERNS = {
  CREATE: 'payment/create',
  CREATE_DELIVERY: 'payment/delivery',
  VERIFY: 'payment/verify',
  REFUND: 'payment/refund',
} as const;

// Orders message patterns (used when talking to orders service)
export const ORDERS_PATTERNS = {
  ORDER_UPDATE_STATUS: 'orders/update-status',
  ESTIMATION_FIND_ONE: 'estimation/find-one',
  ESTIMATION_MARK_PAID: 'estimation/mark-paid',
} as const;
