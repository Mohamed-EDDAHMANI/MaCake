# MaCake — Project Context

> **Generated**: 2026-03-24 | **Purpose**: Persistent context file to avoid re-scanning the entire codebase.

---

## 1. Project Overview

**MaCake** is a multi-sided marketplace for homemade cakes. It connects three types of users:
- **Clients** — browse, order, and pay for personalized cakes
- **Patissieres** (bakers) — publish cakes, manage orders, earn revenue
- **Livreurs** (delivery drivers) — bid on deliveries using an InDrive-style price negotiation model

The platform acts as an **escrow-based intermediary**: payments are held until delivery is confirmed, then split between the patissiere, livreur, and the platform commission.

**Currency**: MAD (Moroccan Dirham)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native (Expo v54), React 19, Expo Router (file-based navigation) |
| **State** | Redux Toolkit + redux-persist (auth + cart persisted) |
| **Styling** | NativeWind (Tailwind CSS for RN), Reanimated, Lottie |
| **Backend** | NestJS 11 (TypeScript) — 6 microservices |
| **Database** | MongoDB (Mongoose ODM), each service has its own DB |
| **Messaging** | RabbitMQ (amqp-connection-manager) for inter-service communication |
| **Cache/Registry** | Redis (ioredis) — service discovery + caching |
| **File Storage** | MinIO (S3-compatible), proxied through gateway `/files/*` |
| **Payments** | Stripe (PaymentIntents + Checkout Sessions) |
| **Real-time** | Socket.io (3 WebSocket namespaces on gateway) |
| **Auth** | JWT (access + refresh tokens), bcryptjs hashing |
| **Containerization** | Docker Compose (all services + infra) |
| **Logging** | Winston (nest-winston) |
| **Rate Limiting** | NestJS Throttler (100 req/min per IP) |
| **Body Limits** | 10MB JSON, 10MB URL-encoded |

---

## 3. Architecture

**Microservices** communicating via **TCP** (NestJS microservices transport) with **Redis-based service discovery**. The gateway looks up service host:port from Redis, creates a TCP client, and forwards requests.

```
                    ┌──────────────────────────────────┐
                    │         Mobile App (Expo)         │
                    │   HTTP + Socket.io (3 namespaces) │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │     Gateway (port 3000)           │
                    │  JWT auth → Role check → Forward  │
                    │  WebSocket: /orders, /ratings,     │
                    │             /payments              │
                    └──┬────┬────┬────┬────┬───────────┘
                       │    │    │    │    │
              ┌────────┘    │    │    │    └────────┐
              ▼             ▼    ▼    ▼             ▼
         auth-service  catalog  order  payment  notation
         (3001/TCP)   (3002)  (3003)  (3005)   (3006)
              │             │    │    │             │
              ▼             ▼    ▼    ▼             ▼
           auth_db     catalog_db orders_db payment_db notation_db
                     (all MongoDB via Mongoose)
```

**Infrastructure**: MongoDB 7, RabbitMQ 3, Redis 7, MinIO

---

## 4. API Routing (Gateway)

All HTTP requests go through the gateway at port **3000**. The URL prefix determines which microservice receives the request:

| Prefix | Service | Port | Description |
|--------|---------|------|-------------|
| `/s1/*` | auth-service | 3001 | User auth, profiles, wallet |
| `/s2/*` | catalog-service | 3002 | Products, categories |
| `/s3/*` | order-service | 3003 | Orders, order items, estimations |
| `/s5/*` | payment-service | 3005 | Payments, wallet top-up, commissions |
| `/s6/*` | notation-service | 3006 | Ratings, likes, followers, profile-likes |
| `/files/*` | MinIO proxy | — | Serves uploaded images (no auth) |
| `/health` | Gateway | — | Health check |

**Routing logic** (`gateway.controller.ts`): `@All(':service/*')` catches all requests, strips the service prefix to get the message pattern, then sends via TCP to the appropriate microservice instance.

---

## 5. Service Details

### 5.1 Auth Service (s1)

**DB**: `auth_db` | **Port**: 3001

**Schemas**:
- `User` — base schema with discriminator on `role` field
  - Fields: name, email, passwordHash, phone, photo, coverPhoto, city, address, country, latitude, longitude, description, status, refreshToken
  - Sub-schemas: `Client` (walletBalance), `Patissiere` (bio, followersCount), `Livreur` (vehicleType, deliveriesCompleted)

**Key Message Patterns**:
| Pattern | Description |
|---------|-------------|
| `auth/login/post` | Email + password login → returns user + tokens |
| `auth/register/post` | Register with role → returns user + tokens |
| `auth/logout/post` | Invalidate refresh token |
| `auth/refresh/post` | Refresh access token |
| `auth/get-profile/get` | Get own profile (with stats) |
| `auth/update-profile/post` | Update profile fields + photo |
| `auth/profile/:id` | Get public profile by user ID |
| `auth/get-profile-by-id/get` | Internal: fetch user by ID |
| `auth/find-by-ids/post` | Internal: batch fetch users by IDs |

**Photo Storage**: MinIO bucket `auth`, path `profile-pics/{userId}/{uuid}.{ext}`

### 5.2 Catalog Service (s2)

**DB**: `catalog_db` | **Port**: 3002

**Schemas**:
- `Product` — title, description, price, images[], ingredients[], categoryId (ref), patissiereId, isActive, personalizationOptions, likesCount, likedByUserIds[]
- `Category` — name, description

**Key Message Patterns**:
| Pattern | Description |
|---------|-------------|
| `product/create` | Create product (PATISSIERE) |
| `product/find-all` | List all active products (public) |
| `product/getOne/:id` | Get single product (public) |
| `product/update` | Update product |
| `product/delete` | Delete product |
| `product/filter` | Filter by category, price, city |
| `product/batch` | Batch fetch products by IDs |
| `product/deactivate` | Event: deactivate product |
| `category/find-all` | List all categories (public) |
| `category/create` | Create category |

**Photo Storage**: MinIO bucket `catalog`

**Enrichment Pattern** (cross-service calls during find-all/getOne):
1. Extract patissiereIds from products → call `auth/find-by-ids` via RabbitMQ → get patissiere name, photo, city
2. Extract productIds → call `rating/batch-average` via RabbitMQ → get average ratings
3. Call `like/batch-count` + `like/batch-liker-ids` → get like counts and liker user IDs
4. Merge all into enriched product response with `patissiere`, `likesCount`, `likedByUserIds`, `location`

### 5.3 Order Service (s3)

**DB**: `orders_db` | **Port**: 3003

**Schemas**:
- `Order` — clientId, patissiereId, patissiereAddress, deliveryAddress, deliveryAddressSource, deliveryLatitude/Longitude, patissiereLatitude/Longitude, status (enum), requestedDateTime, totalPrice
- `OrderItem` — orderId, productId, quantity, price, customizationDetails {colors, garniture, message}
- `Estimation` — orderId, details, price, userRole (client|delivery), status (pending|confirmed), createdBy, acceptedBy, paidAt
- `OrderStatusHistory` — orderId, status, changedAt

**Order Status Flow**:
```
pending → accepted → preparing → completed → delivering → delivered
                                                          (or refused at any stage)
```

**Key Message Patterns**:
| Pattern | Description |
|---------|-------------|
| `order/create` | Create order with items (CLIENT) |
| `orders/find-all` | Client's orders |
| `orders/patissiere/find-all` | Patissiere's received orders |
| `order/find-one/:id` | Single order with items |
| `order/accept/:id` | Accept order (PATISSIERE) |
| `order/complete/:id` | Mark as completed (PATISSIERE) |
| `order/start-delivery/:id` | Client requests delivery |
| `order/delivered-by-client/:id` | Client picks up directly |
| `estimation/client` | Client creates delivery estimation |
| `estimation/delivery` | Livreur proposes delivery price |
| `estimation/find-by-order/:id` | All estimations for an order |
| `estimation/confirm/:id` | Livreur confirms their estimation |
| `estimation/accept-delivery-offer/:id` | Client accepts livreur's offer |
| `estimation/mark-paid/:id` | Mark estimation as paid |
| `estimation/find-pending-client` | Available deliveries for livreurs |
| `estimation/find-accepted-delivery` | Livreur's accepted deliveries |
| `estimation/find-estimated-delivery` | Livreur's pending offers |
| `estimation/find-delivered-delivery` | Livreur's completed deliveries |

### 5.4 Payment Service (s5)

**DB**: `payment_db` | **Port**: 3005

**Architecture**: Clean Architecture (use-cases, repositories, DTOs)

**Schemas**:
- `Payment` — orderId?, estimationId?, clientId, amount, paymentMethod (stripe_card|wallet), stripePaymentIntentId, stripeCheckoutSessionId, stripeCustomerId, status (blocked|released|refunded)
- `Transaction` — userId, type (earning|commission), amount, relatedOrderId, stripeChargeId
- `Commission` — type (order|delivery), percentage (0-100)

**Key Message Patterns**:
| Pattern | Description |
|---------|-------------|
| `payment/create` | Create order payment (Stripe or wallet) |
| `payment/delivery` | Create delivery payment |
| `payment/confirm` | Confirm Stripe order payment |
| `payment/delivery-confirm` | Confirm Stripe delivery payment |
| `wallet/intent` | Create Stripe PaymentIntent for wallet top-up |
| `wallet/confirm` | Confirm wallet top-up after Stripe success |
| `wallet/topup` | Legacy alias for wallet/intent |
| `wallet/webhook` | Stripe webhook handler |

**Payment Flow**:
1. Client pays → payment status = `blocked`
2. Order delivered → payment status = `released`
3. Platform deducts **5% commission** → creates Transaction records (95% to patissiere, 5% platform)
4. Patissiere/livreur wallets credited via auth-service RabbitMQ calls

**Wallet Payment**: Immediate release (debit client → credit patissiere → status='released')
**Stripe Payment**: Create PaymentIntent → client confirms → verify → release funds

### 5.5 Notation Service (s6)

**DB**: `notation_db` | **Port**: 3006

**Schemas**:
- `Rating` — fromUserId, toUserId, orderId?, productId?, stars (1-5), comment
- `Like` — userId, productId (toggle)
- `Follower` — clientId, patissiereId (toggle)
- `ProfileLike` — userId, patissiereId (toggle)

**Key Message Patterns**:
| Pattern | Description |
|---------|-------------|
| `rating/create` | Rate a user or product |
| `rating/find-by-user/:id` | Ratings received by user |
| `rating/find-by-product/:id` | Ratings for a product |
| `rating/average/:id` | Average rating for a user |
| `rating/batch-average` | Batch average for multiple users |
| `like/toggle` | Toggle product like |
| `like/count/:id` | Like count for product |
| `like/batch-count` | Batch like counts |
| `like/check` | Check if user liked product |
| `like/find-by-user/:id` | Products liked by user |
| `follower/toggle` | Follow/unfollow patissiere |
| `follower/list/:id` | Get patissiere's followers |
| `follower/count/:id` | Follower count |
| `follower/check` | Check if following |
| `profile-like/toggle` | Like a patissiere's profile |
| `profile-like/count/:id` | Profile like count |
| `profile-like/check` | Check if profile liked |

---

## 6. Gateway Middleware

### Auth Flow
1. **AuthMiddleware**: Checks public routes list → if public, pass through. Otherwise, extract JWT from `Authorization: Bearer <token>`, verify with JwtService, attach `req.user = { id, email, role, ... }`.
2. **AuthorizeMiddleware**: Fetches service endpoint roles from Redis → checks if `user.role` is in the allowed roles list. If no roles specified, allows by default.

### Public Routes (no auth needed)
- Login, register, refresh token
- Product listing, filtering, single product, categories
- Rating/like/follower counts (read-only)
- Health endpoints

### WebSocket Event Emission
The gateway controller emits WebSocket events after forwarding responses:
- **s3 responses** → `order.status.changed` via `/orders` namespace
- **s5 responses** → `payment.confirmed`, `wallet.changed`, `estimation.paid` via `/payments` namespace
- **s6 responses** → `like.toggled` via `/payments` namespace

---

## 7. Real-time (WebSocket)

Three Socket.io namespaces on the gateway:

| Namespace | Events | Purpose |
|-----------|--------|---------|
| `/orders` | `order.status.changed`, `estimation.created` | Order status updates, new delivery requests |
| `/ratings` | `rating.created` | New rating notifications |
| `/payments` | `payment.confirmed`, `wallet.changed`, `like.toggled`, `estimation.paid` | Payment confirmations, wallet balance changes, like syncing |

**Frontend singletons**: `getOrderSocket()`, `getPaymentSocket()`, `getRatingSocket()` — each creates one Socket.io connection to the corresponding namespace.

---

## 8. Frontend Structure

### Navigation (Expo Router)
```
app/
├── _layout.tsx                    # Root: Redux Provider, PersistGate, Stripe, Splash, LikeSocketListener
├── index.tsx                      # Redirect based on auth state
├── edit-profile.tsx               # Edit profile screen
├── settings.tsx                   # Settings screen
├── product/[id].tsx               # Product detail (standalone)
│
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx                  # Email + password login
│   └── register.tsx               # Multi-step: Role → Account → Profile
│
├── (main)/                        # Authenticated main flow
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx            # Tab bar configuration
│   │   ├── index.tsx              # Home — browse products, filter
│   │   ├── favorites.tsx          # Liked products & followed patissieres
│   │   ├── cart.tsx               # Cart with customization
│   │   ├── create.tsx             # Patissiere: create product
│   │   ├── orders.tsx             # Order history + status tracking
│   │   ├── dashboard.tsx          # Dashboard
│   │   └── profile.tsx            # User profile
│   ├── workspace.tsx              # Livreur: OSM map + delivery tabs
│   ├── checkout.tsx               # Order review + delivery address
│   ├── payment.tsx                # Stripe payment flow
│   ├── delivery-order/[id].tsx    # Delivery order detail
│   ├── order/[id].tsx             # Order detail
│   ├── product/[id].tsx           # Product detail (in main stack)
│   └── profile/[id].tsx           # Public patissiere profile
│
├── (client)/                      # Client-specific screens
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── cart.tsx
│   ├── favorites.tsx
│   ├── orders.tsx
│   └── profile.tsx
│
├── (patissiere)/                  # Patissiere-specific screens
│   ├── index.tsx
│   ├── orders.tsx
│   ├── products.tsx
│   ├── messages.tsx
│   └── profile.tsx
│
└── (livreur)/                     # Livreur-specific screens
    ├── index.tsx
    ├── deliveries.tsx
    ├── earnings.tsx
    └── profile.tsx
```

### Redux Store
```
store/
├── store.ts             # Redux config, persistence whitelist: ['auth', 'cart']
├── hooks.ts             # useAppDispatch, useAppSelector
├── index.ts             # Re-exports
└── features/
    ├── auth/
    │   ├── authSlice.ts       # AuthState: user, tokens, isAuthenticated, profileStats
    │   ├── authApi.ts         # login, register, getProfile, updateProfile, getProfileById
    │   └── index.ts
    ├── catalog/
    │   ├── catalogSlice.ts    # products[], categories[], loading, filters
    │   ├── catalogApi.ts      # fetchProducts, fetchProductById, filterProducts, toggleLike
    │   └── index.ts
    ├── cart/
    │   └── cartSlice.ts       # items[] with quantity + customization
    ├── order/
    │   └── orderApi.ts        # createOrder, getOrders, acceptOrder, completeOrder, etc.
    ├── estimation/
    │   ├── estimationSlice.ts # available, accepted, estimated, delivered lists
    │   ├── estimationApi.ts   # create/get/confirm estimations for delivery flow
    │   └── index.ts
    ├── payment/
    │   └── paymentApi.ts      # createOrderPayment, createDeliveryPayment, walletTopUp
    ├── rating/
    │   └── ratingApi.ts       # createRating, getRatings, getAverage
    ├── follow/
    │   ├── followSlice.ts     # Following state
    │   ├── followApi.ts       # toggle, check, list followers
    │   └── index.ts
    └── profileLike/
        ├── profileLikeSlice.ts
        ├── profileLikeApi.ts  # toggle, check, count profile likes
        └── index.ts
```

### Key Lib Files
| File | Purpose |
|------|---------|
| `axios.ts` | API client with base URL resolution (env → LAN IP → platform default), JWT interceptor, 401 auto-refresh |
| `order-socket.ts` | Socket.io singleton for `/orders` namespace |
| `payment-socket.ts` | Socket.io singleton for `/payments` namespace |
| `rating-socket.ts` | Socket.io singleton for `/ratings` namespace |
| `workspace-map-html.ts` | OSM map HTML builder for WebView (livreur workspace) |
| `stripe-safe.ts` | Safe dynamic import of Stripe RN SDK |
| `utils.ts` | `buildPhotoUrl()` — resolves MinIO keys to gateway proxy URLs |
| `file-utils.ts` | Image/file helpers for uploads |
| `product-search.ts` | Client-side product search/filter utilities |
| `cities.ts` / `countries.ts` | Static location data |

---

## 9. Data Models

### User (auth_db)
```
User { name, email, passwordHash, phone, photo, coverPhoto, city, address,
       country, latitude, longitude, description, status, role, refreshToken }
  └── Client extends User { walletBalance }
  └── Patissiere extends User { bio, followersCount }
  └── Livreur extends User { vehicleType, deliveriesCompleted }
```

### Product (catalog_db)
```
Product { title, description, price, images[], ingredients[], categoryId→Category,
          patissiereId, isActive, personalizationOptions, likesCount, likedByUserIds[] }
Category { name, description }
```

### Order (orders_db)
```
Order { clientId, patissiereId, patissiereAddress, deliveryAddress,
        deliveryAddressSource, deliveryLat/Lng, patissiereLat/Lng,
        status[pending|accepted|refused|preparing|completed|delivering|delivered],
        requestedDateTime, totalPrice }
OrderItem { orderId→Order, productId, quantity, price, customizationDetails }
Estimation { orderId→Order, details, price, userRole[client|delivery],
             status[pending|confirmed], createdBy, acceptedBy, paidAt }
OrderStatusHistory { orderId→Order, status, changedAt }
```

### Payment (payment_db)
```
Payment { orderId?, estimationId?, clientId, amount,
          paymentMethod[stripe_card|wallet], stripePaymentIntentId,
          stripeCheckoutSessionId, stripeCustomerId,
          status[blocked|released|refunded] }
Transaction { userId, type[earning|commission], amount, relatedOrderId }
Commission { type[order|delivery], percentage }
```

### Notation (notation_db)
```
Rating { fromUserId, toUserId, orderId?, productId?, stars(1-5), comment }
Like { userId, productId }
Follower { clientId, patissiereId }
ProfileLike { userId, patissiereId }
```

---

## 10. Key Business Workflows

### Order Lifecycle
1. **CLIENT** browses products → adds to cart with customization (colors, garniture, message)
2. **CLIENT** proceeds to checkout → chooses delivery address (profile or GPS location)
3. **CLIENT** creates order → status: `pending`
4. **PATISSIERE** receives notification → accepts → status: `accepted`
5. **PATISSIERE** starts preparation → status: `preparing`
6. **PATISSIERE** finishes → status: `completed`
7. **CLIENT** chooses delivery method:
   - **Self-pickup**: marks delivered directly → status: `delivered`
   - **Delivery**: creates delivery estimation (proposed price)
8. **LIVREUR** sees available deliveries → proposes their own price
9. **CLIENT** accepts a livreur's offer → estimation status: `confirmed`
10. **CLIENT** pays delivery fee (wallet or Stripe)
11. **LIVREUR** picks up and delivers → status: `delivering` → `delivered`

### Delivery Estimation (InDrive Model)
- Client creates an estimation with a proposed delivery price
- Multiple livreurs can see it and counter-propose with their own price
- Client accepts one livreur's offer → that estimation is confirmed
- Client pays delivery fee → estimation marked as paid
- Real-time updates via `estimation.created` WebSocket event

### Payment Flow
1. Order payment: Client pays order total (cake price) → Payment created with status `blocked`
2. On delivery confirmation → payment `released`
3. Commission deducted → Transaction records created (earning for patissiere, commission for platform)
4. Delivery payment: Same flow but for the delivery fee → livreur receives net amount after commission
5. Wallet: Clients can top up wallet via Stripe, then pay for orders/deliveries from wallet balance

### Auth Flow
1. Register with role (CLIENT/PATISSIERE/LIVREUR) → multi-step form (Role → Account → Profile)
2. Login → JWT access token (7d expiry) + refresh token (30d, httpOnly cookie)
3. On 401 → auto-refresh via interceptor → retry original request
4. Profile photos uploaded to MinIO, served via gateway `/files/auth/...`

---

## 11. Frontend API Endpoints Map

| Frontend Call | HTTP | Gateway Endpoint |
|--------------|------|-----------------|
| Login | POST | `/s1/auth/login/post` |
| Register | POST | `/s1/auth/register/post` |
| Refresh | POST | `/s1/auth/refresh/post` |
| Get Profile | GET | `/s1/auth/get-profile` |
| Update Profile | POST | `/s1/auth/update-profile` |
| Get Profile By ID | GET | `/s1/auth/profile/:id` |
| Fetch Products | GET | `/s2/product/find-all` |
| Get Product | GET | `/s2/product/getOne/:id` |
| Filter Products | POST | `/s2/product/filter` |
| Batch Products | POST | `/s2/product/batch` |
| Fetch Categories | GET | `/s2/category/find-all` |
| Create Order | POST | `/s3/order/create` |
| Client Orders | GET | `/s3/orders/find-all` |
| Patissiere Orders | GET | `/s3/orders/patissiere/find-all` |
| Order Detail | GET | `/s3/order/find-one/:id` |
| Accept Order | POST | `/s3/order/accept/:id` |
| Complete Order | POST | `/s3/order/complete/:id` |
| Start Delivery | POST | `/s3/order/start-delivery/:id` |
| Delivered by Client | POST | `/s3/order/delivered-by-client/:id` |
| Client Estimation | POST | `/s3/estimation/client` |
| Delivery Estimation | POST | `/s3/estimation/delivery` |
| Find Estimations | GET | `/s3/estimation/find-by-order/:id` |
| Confirm Estimation | POST | `/s3/estimation/confirm/:id` |
| Accept Delivery Offer | POST | `/s3/estimation/accept-delivery-offer/:id` |
| Mark Estimation Paid | POST | `/s3/estimation/mark-paid/:id` |
| Available Deliveries | GET | `/s3/estimation/find-pending-client` |
| Accepted Deliveries | GET | `/s3/estimation/find-accepted-delivery` |
| Estimated Deliveries | GET | `/s3/estimation/find-estimated-delivery` |
| Delivered Deliveries | GET | `/s3/estimation/find-delivered-delivery` |
| Create Order Payment | POST | `/s5/payment/create` |
| Create Delivery Payment | POST | `/s5/payment/delivery` |
| Confirm Order Payment | POST | `/s5/payment/confirm` |
| Confirm Delivery Payment | POST | `/s5/payment/delivery-confirm` |
| Wallet Top-Up Intent | POST | `/s5/wallet/intent` |
| Confirm Wallet Top-Up | POST | `/s5/wallet/confirm` |
| Toggle Like | POST | `/s6/like/toggle` |
| Toggle Follow | POST | `/s6/follower/toggle` |
| Toggle Profile Like | POST | `/s6/profile-like/toggle` |
| Create Rating | POST | `/s6/rating/create` |

---

## 12. User Roles

| Role | Code | Description |
|------|------|-------------|
| Client | `CLIENT` | Orders cakes, pays, rates |
| Patissiere | `PATISSIERE` | Creates products, manages orders |
| Livreur | `LIVREUR` | Bids on deliveries, delivers orders |
| Admin | `ADMIN` | Platform management |
| Manager | `MANAGER` | Limited platform management |
| Super Admin | `SUPER_ADMIN` | Full platform access |

---

## 13. Environment & Infrastructure

### Docker Services
| Service | Container | Port(s) |
|---------|-----------|---------|
| MongoDB 7 | macake-mongodb-dev | 27017 |
| RabbitMQ 3 | macake-rabbitmq-dev | 5673 (AMQP), 15673 (management) |
| Redis 7 | macake-redis-dev | 6379 |
| MinIO | macake-minio-dev | 9000 (API), 9001 (console) |
| Gateway | gateway-dev | 3000 |
| Auth Service | auth-service-dev | 3001 |
| Catalog Service | catalog-service-dev | 3002 |
| Order Service | order-service-dev | 3003 |
| Payment Service | payment-service-dev | 3005 |
| Notation Service | notation-service-dev | 3006 |

### Key Environment Variables
- `JWT_SECRET` — shared across gateway + auth-service
- `MONGODB_URI` — per-service with different DB names
- `RABBITMQ_URL` — `amqp://guest:guest@rabbitmq:5672?heartbeat=30`
- `REDIS_HOST` / `REDIS_PORT` — for service registry
- `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET`
- `STRIPE_CURRENCY` — `mad`
- `EXPO_PUBLIC_API_URL` — frontend gateway URL (e.g., `http://192.168.3.142:3000`)
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key

### Service Discovery
Each microservice registers itself in Redis on startup:
```
serviceKey:{routeKey} → { serviceName, instances: [{host, port}], endpoints: [{pattern, roles}] }
```
The gateway reads this to route requests and enforce role-based access.

---

## 14. Architecture Patterns

- **Clean Architecture** (payment-service, catalog-service, order-service): presentation (controllers) → application (use-cases) → domain (entities) → infrastructure (DB/messaging)
- **Service Registry**: Each service registers in Redis on startup with host, port, and endpoint roles. Gateway queries Redis for routing and RBAC.
- **Enrichment Pattern**: Catalog-service enriches products by batch-calling auth + notation services via RabbitMQ
- **Event-Driven**: Gateway broadcasts WebSocket events after forwarding microservice responses

### Frontend Colors
- **Primary**: `#DA1B61` (pink)
- **Background**: `#F8F8F8`
- **Text**: `#1E293B`
- **Surface**: `#FFFFFF`

### Photo URL Resolution
MinIO keys stored in DB → resolved to full URL via `buildPhotoUrl()`:
```
key: "profile-pics/userId/uuid.jpg"
→ URL: "http://<gateway>:3000/files/auth/profile-pics/userId/uuid.jpg"
```

**Workspace Map (Livreur)**: Uses OpenStreetMap/Leaflet tiles rendered in a WebView via `workspace-map-html.ts`. Default center: Casablanca (31.7917, -7.0926). Markers: green (delivery), orange (pickup), magenta (user). 4 tabs: Available, Accepted, Estimated, Historic.

---

## 15. Commands

```bash
# Start all with Docker
make up          # docker-compose up -d
make down        # docker-compose down
make restart     # down + up
make logs        # docker-compose logs -f
make up-build    # docker-compose up --build

# Dev mode (without Docker)
make start-dev   # Starts auth, catalog, gateway, orders concurrently

# Frontend
cd front && npx expo start
```
