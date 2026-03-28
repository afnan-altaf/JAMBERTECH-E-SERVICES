# JamberTech E-SERVICES SMM Panel

## Overview

A complete Social Media Marketing (SMM) Reseller Panel. Users can browse services, place orders, and track their order history. Admins can manage providers, sync services, and manage users.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (v4 for libs, v3 for api-server routes)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Auth**: JWT (bcryptjs for hashing, jsonwebtoken for tokens)
- **Scheduling**: node-cron (service sync every 24h)
- **HTTP client**: axios (for provider API calls)
- **Frontend**: React + Vite + Tailwind CSS + Zustand + Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (backend)
│   └── jambertech/         # React + Vite frontend (SMM Panel UI)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Database Models

### Users
- id, name, email, password (bcrypt hashed), balance (numeric, default 0), role (user/admin), emailVerified (boolean)

### Providers
- id, name, apiUrl, apiKey, status (active/inactive)
- Provider 1: Socialsphare (https://socialsphare.com/api/v2) - uses `link` param
- Provider 2: MK SMM Panel (https://mksmmpanel.com/api/v2) - uses `url` param

### Services
- id, providerServiceId, providerId, name, category, type
- originalRate (provider's price), sellRate (original + 3.5% margin)
- min, max, status (active/inactive)
- Sell rate formula: `sellRate = originalRate + (originalRate * 0.035)`

### Orders
- id, userId, serviceId, providerOrderId, link, quantity, charge, status

### OTPs
- id, email, code (6-digit), type (email_verification / password_reset), used (boolean), expiresAt (15 min TTL)

## API Routes

### Auth
- POST /api/auth/register - Register new user (sends email OTP, requires verification before login)
- POST /api/auth/verify-email - Verify OTP, returns JWT token
- POST /api/auth/resend-otp - Resend verification OTP
- POST /api/auth/login - Login (only verified emails), returns JWT token
- POST /api/auth/forgot-password - Send password reset OTP via email
- POST /api/auth/reset-password - Reset password with OTP
- POST /api/auth/logout
- GET /api/auth/me - Get current user (requires Bearer token)

### Users (Admin only)
- GET /api/users - List all users
- PATCH /api/users/balance - Add balance to user

### Providers (Admin only)
- GET /api/providers
- POST /api/providers
- PATCH /api/providers/:id
- DELETE /api/providers/:id
- POST /api/providers/sync - Trigger 24h service sync manually

### Services
- GET /api/services - List active services (optional ?category= filter)
- GET /api/services/categories - List unique categories
- GET /api/services/:id
- PATCH /api/services/:id - Update service (Admin only)

### Orders
- GET /api/orders - User sees own orders, admin sees all
- POST /api/orders - Place order (deducts balance, calls provider API)
- GET /api/orders/:id

## Key Features

### 3.5% Margin Pricing
When syncing services from providers, sell price is calculated as:
```
sellRate = parseFloat(originalRate) + (parseFloat(originalRate) * 0.035)
```

### Provider Dynamic Routing
Order placement auto-detects provider:
- MK SMM Panel (mksmmpanel.com) → uses `url` parameter
- All other providers → uses `link` parameter

### Cron Job
- Runs at 2 AM daily: `0 2 * * *`
- Syncs services from all active providers
- Adds new services, updates changed rates, deactivates removed services

### Order Flow
1. Check user balance >= charge
2. Deduct balance optimistically
3. Call provider API to place order
4. Save provider_order_id in DB
5. If provider fails → refund balance, show error

## Default Admin Account
- Email: admin@jambertech.com
- Password: admin123
- Role: admin (set via DB after registration)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

## Important Notes

- `zod/v4` is used in lib packages; regular `zod` must be used directly in api-server routes due to esbuild bundling
- All API routes require `Authorization: Bearer <token>` header for protected endpoints
- JWT secret should be set via JWT_SECRET environment variable in production
