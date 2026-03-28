FROM node:20-slim AS base
WORKDIR /app
RUN npm install -g pnpm@9

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/jambertech/package.json ./artifacts/jambertech/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-zod/package.json ./lib/api-zod/
RUN pnpm install --no-frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .

# API spec codegen (type generation)
RUN pnpm --filter @workspace/api-spec run codegen

# Backend build
RUN pnpm --filter @workspace/api-server run build

# Frontend build
RUN NODE_ENV=production pnpm --filter @workspace/jambertech run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/jambertech/package.json ./artifacts/jambertech/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-zod/package.json ./lib/api-zod/

# Sirf production dependencies
RUN pnpm install --no-frozen-lockfile --prod

# Built files copy karo
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/jambertech/dist ./artifacts/jambertech/dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "artifacts/api-server/dist/index.mjs"]
