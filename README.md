# egg (Tunisia) — UGC Creator Marketplace (MVP)

Next.js + Tailwind + MongoDB Atlas marketplace connecting brands/agencies with UGC creators using an in-app **Coin** economy (**1 DT = 10 Coins**).

## Tech stack
- **Next.js** (App Router) + TypeScript
- **Tailwind CSS**
- **MongoDB Atlas** + Mongoose
- **Auth**: email+password → JWT (stored in `localStorage` on the client)

## Requirements
- Node **v22** (see `.nvmrc`)
- A MongoDB Atlas database

## Setup
1. Use Node 22:

```bash
nvm use v22
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` from the template:

```bash
cp .env.example .env
```

Set:
- `MONGODB_URI`
- `JWT_SECRET`

4. Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

5. (Optional) Seed the database with sample creators, brands, and orders:

```bash
npm run seed
```

## Scripts
- `npm run dev` — start the Next.js dev server
- `npm run build` — production build
- `npm start` — run the production server (after `build`)
- `npm run lint` — run ESLint
- `npm run seed` — populate MongoDB with sample data (`scripts/seed.ts`)

## Core features implemented (MVP)
- **Auth**: `/auth/register`, `/auth/login` + `/api/me`
- **Discovery feed**: `/` with basic niche/rating filters
- **Creator profile**: `/creators/[id]` with **1-coin first visit** debit (`/api/creators/[id]/visit`)
- **Coin packages + wallet top-up**: `/api/coin-packages`, `/api/wallet/topup` (optional `paymentProvider`: Konnect / Paymee on checkout)
- **Wallet ledger**: `/api/wallet/transactions`
- **Orders**: configurator → `/api/orders` and status transitions
- **Reviews**: `/api/reviews` (only after order is `COMPLETED`) + admin delete endpoint
- **Creator dashboard**: `/dashboard/creator` availability + withdrawals (10% commission)
- **Admin**: `/admin/*` pages + APIs for verification, withdrawals, coin packages, users

## Admin user (how to create)
Registration does **not** create admins. For now, create a user normally, then update their role in MongoDB:
- Set `users.role` to `"admin"` for that user’s document.

