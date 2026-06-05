# ── Build Stage ─────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL dependencies (need devDeps for build tooling)
COPY package*.json ./
RUN npm ci

# Copy source
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/
COPY script/ ./script/
COPY vite.config.ts tsconfig.json drizzle.config.ts components.json postcss.config.js ./

# Build client (Vite → dist/public/) and server (esbuild → dist/index.cjs)
RUN npm run build

# ── Production Stage ───────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Copy shared schema for drizzle migrations (db:push)
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.cjs"]
