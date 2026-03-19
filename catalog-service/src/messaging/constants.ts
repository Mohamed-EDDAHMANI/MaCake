// RabbitMQ Client Tokens
export const NOTATION_CLIENT = 'NOTATION_CLIENT';
export const AUTH_CLIENT = 'AUTH_CLIENT';

// Auth Service Message Patterns (RMQ)
export const AUTH_PATTERNS = {
  FIND_BY_IDS: 'auth/find-by-ids',
} as const;

// Notation Service Message Patterns (RMQ)
export const NOTATION_PATTERNS = {
  RATING_BATCH_AVERAGE: 'rating/batch-average',
  LIKE_BATCH_COUNT: 'like/batch-count',
  LIKE_BATCH_LIKER_IDS: 'like/batch-liker-ids',
  LIKE_COUNT: 'like/count',
} as const;

// Catalog Service Message Patterns
export const CATALOG_PATTERNS = {
  // Product patterns
  PRODUCT_CREATE: 'product/create',
  PRODUCT_FIND_ALL: 'product/find-all',
  PRODUCT_FIND_ONE: 'product/getOne',
  PRODUCT_UPDATE: 'product/update',
  PRODUCT_DELETE: 'product/delete',
  PRODUCT_FILTER: 'product/filter',
  PRODUCT_DEACTIVATE: 'product/deactivate',
  
  // Category patterns
  CATEGORY_CREATE: 'category/create',
  CATEGORY_FIND_ALL: 'category/find-all',
  CATEGORY_FIND_ONE: 'category/findOne',
  CATEGORY_UPDATE: 'category/update',
  CATEGORY_REMOVE: 'category/remove',
} as const;

// RabbitMQ Event Patterns
export const NOTATION_EVENTS = {
  LIKE_TOGGLED: 'like.toggled',
} as const;
