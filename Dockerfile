ARG NODE_VERSION=24
ARG PNPM_VERSION=11.21.0

# ========================================
# 1. BASE: Enable Corepack & pnpm
# ========================================

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# ========================================
# 2. BUILD: Install everything & build JS files
# ========================================

FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build
RUN pnpm prune --prod

# ========================================
# 3. PRODUCTION: Copy final files and run
# ========================================

FROM node:${NODE_VERSION}-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

# Non-root user setup
# RUN groupadd --system --gid 1001 nestjs \
#     && useradd --system --uid 1001 --gid 1001 --create-home nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# USER nestjs
EXPOSE 3000

CMD ["node", "dist/main.js"]