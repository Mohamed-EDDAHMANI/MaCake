// Notation Service Message Patterns (TCP from Gateway)
export const NOTATION_PATTERNS = {
  // Rating patterns
  RATING_CREATE: 'rating/create',
  RATING_FIND_BY_USER: 'rating/find-by-user',
  RATING_FIND_BY_PRODUCT: 'rating/find-by-product',
  RATING_AVERAGE: 'rating/average',
  RATING_BATCH_AVERAGE: 'rating/batch-average',
  RATING_DELETE: 'rating/delete',

  // Like patterns
  LIKE_TOGGLE: 'like/toggle',
  LIKE_COUNT: 'like/count',
  LIKE_BATCH_COUNT: 'like/batch-count',
  LIKE_BATCH_LIKER_IDS: 'like/batch-liker-ids',
  LIKE_CHECK: 'like/check',
  LIKE_FIND_BY_USER: 'like/find-by-user',

  // Follower patterns
  FOLLOWER_TOGGLE: 'follower/toggle',
  FOLLOWER_LIST: 'follower/list',
  FOLLOWER_COUNT: 'follower/count',
  FOLLOWER_CHECK: 'follower/check',
} as const;

// RabbitMQ Client Tokens
export const CATALOG_CLIENT = 'CATALOG_CLIENT';

// Events emitted to other services
export const NOTATION_EVENTS = {
  LIKE_TOGGLED: 'like.toggled',
} as const;
