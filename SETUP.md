# JamberTech E-SERVICES — Setup Guide

Ye guide tumhe apne server ya VPS par is project ko host karne mein help karega.

---

## Requirements

- **Node.js** v20 ya usse upar
- **pnpm** v9+ (`npm install -g pnpm`)
- **PostgreSQL** database (local ya cloud jaise Supabase, Neon, Railway)
- **Resend** account (free plan mein 3,000 emails/month milte hain)

---

## Step 1 — Code clone karo

```bash
git clone https://github.com/TUMHARA_USERNAME/jambertech.git
cd jambertech
```

---

## Step 2 — Dependencies install karo

```bash
pnpm install
```

---

## Step 3 — Environment variables set karo

```bash
cp .env.example .env
```

Ab `.env` file open karo aur apni real values bharo:

| Variable | Kahan se milega |
|----------|----------------|
| `DATABASE_URL` | Tumhara PostgreSQL URL |
| `JWT_SECRET` | Terminal mein `openssl rand -base64 32` chalao |
| `RESEND_API_KEY` | [resend.com](https://resend.com) > API Keys |
| `FROM_EMAIL` | Resend mein verify kiya hua email/domain |

---

## Step 4 — Database tables banana

```bash
pnpm --filter @workspace/db run push
```

Ye command tumhare PostgreSQL database mein automatically saari tables bana dega.

---

## Step 5 — API spec se code generate karo

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Step 6 — Backend build aur start karo

```bash
# Build karo
pnpm --filter @workspace/api-server run build

# Start karo
pnpm --filter @workspace/api-server run start
```

API server port `8080` par chalega (ya jo `PORT` env var mein diya ho).

---

## Step 7 — Frontend build karo (production ke liye)

```bash
pnpm --filter @workspace/jambertech run build
```

Build output `artifacts/jambertech/dist/` mein ayega. Ise kisi bhi static file server (Nginx, Apache, Vercel, Netlify) par serve kar sakte ho.

---

## Step 8 — Admin account banana

Pehli baar run karne ke baad ek user register karo, phir database mein admin role de do:

```sql
UPDATE users SET role = 'admin', email_verified = true WHERE email = 'tumhara@email.com';
```

---

## GitHub Actions (Optional CI/CD)

Agar GitHub Actions se auto-deploy karna chahte ho, apni repository mein ye secrets add karo:

**Settings > Secrets and variables > Actions > New repository secret**

```
DATABASE_URL       = postgresql://...
JWT_SECRET         = tumhara-secret
RESEND_API_KEY     = re_xxxx
FROM_EMAIL         = noreply@yourdomain.com
```

---

## Environment Variables — Poori List

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=strong-random-secret-min-32-chars
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
```

---

## Important Security Notes

- `.env` file **kabhi** GitHub par push mat karo
- `JWT_SECRET` kam se kam 32 characters ka rakho
- Production mein `NODE_ENV=production` zaroor set karo
- Database ka password strong rakho
