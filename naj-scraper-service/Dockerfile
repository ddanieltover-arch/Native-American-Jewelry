# ─── Stage 1: Dependencies ───────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

# Install system dependencies for Playwright + Sharp
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    # Sharp native dependencies
    libvips-dev \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --ignore-scripts

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# ─── Stage 2: Build ───────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 3: Production runner ──────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Re-install only the system deps needed at runtime
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libatspi2.0-0 libx11-6 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libvips \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers

COPY --from=deps    /app/node_modules           ./node_modules
COPY --from=builder /app/dist                   ./dist
COPY --from=deps    /root/.cache/ms-playwright  ./browsers
COPY .env.example   ./.env.example

# Create logs directory
RUN mkdir -p logs assets

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

# Default: run the worker (queue processor + scheduler)
# Override CMD to run "node dist/index.js" for the HTTP API only
CMD ["node", "dist/worker.js"]
