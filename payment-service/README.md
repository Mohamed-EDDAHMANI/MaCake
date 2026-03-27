# Payment Service

NestJS microservice for payments using **DDD architecture** and **MongoDB (Mongoose)**.

## Architecture

The service follows layered DDD folders:

- `src/domain`: entities and repository contracts
- `src/application`: use-cases
- `src/infrastructure`: Mongo schemas and repository implementations
- `src/presentation`: message controllers and DTOs

## MongoDB schema (Paiement & Argent)

Collections implemented from the "Paiement & Argent" classes:

- `payments`
  - `orderId`, `clientId`, `amount`
  - `paymentMethod` (`stripe_card | wallet`)
  - `stripePaymentIntentId`, `stripeCustomerId`
  - `status` (`blocked | released | refunded`)
  - `createdAt`

- `transactions`
  - `userId`, `type` (`earning | commission`)
  - `amount`, `relatedOrderId`, `stripeChargeId`, `createdAt`

- `commissions`
  - `type` (`order | delivery`)
  - `percentage`

## Environment

Required variable:

- `MONGODB_URI` (ex: `mongodb://root:password@mongodb:27017/payment_db?authSource=admin`)

## Run

```bash
npm install
npm run start:dev
```
