# =========================
# Base image
# =========================
FROM node:22-alpine AS base
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

# =========================
# Dependencies
# =========================
FROM base AS deps

# Native deps (in case any package needs them)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./

# Install all deps (prod + dev) for build
RUN npm ci

# =========================
# Build
# =========================
FROM base AS builder

ENV NODE_ENV=development

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY . .

# Reuse installed deps from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Build Next.js app
RUN npm run build

# =========================
# Runtime
# =========================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: non-root user
USER node

# Copy only what we need to run
COPY package.json ./

# node_modules (still include dev deps, but we can prune them)
COPY --from=deps /app/node_modules ./node_modules

# Built app + static assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Optionally prune devDependencies to shrink image
RUN npm prune --omit=dev

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000', r => { if (r.statusCode >= 400) process.exit(1); }).on('error', () => process.exit(1));"

# Next.js production server
CMD ["npm", "start"]
