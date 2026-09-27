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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN npx prisma generate
RUN pnpm run build
RUN pnpm prune --prod

# ========================================
# 3. PRODUCTION: Copy final files and run
# ========================================

FROM node:${NODE_VERSION}-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

# Install Chromium and required fonts for PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Point Puppeteer to the installed Chromium binary
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Non-root user setup
# RUN groupadd --system --gid 1001 nestjs \
#     && useradd --system --uid 1001 --gid 1001 --create-home nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# USER nestjs
EXPOSE 3000

CMD ["node", "dist/main.js"]