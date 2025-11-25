# -------------------------
# 1) Build stage
# -------------------------
FROM node:22-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy package files and lock file first for better caching
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including dev dependencies for build)
# Use pnpm's default store location for better cache efficiency
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source files (this invalidates cache when source changes)
COPY . .

# Generate files and build
RUN pnpm run generateAuthors && pnpm run generateAudioFeed && pnpm run coolify-build

# -------------------------
# 2) Production stage
# -------------------------
FROM node:22-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# Copy built application from builder stage (only the built files)
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static
COPY --from=builder /app/docusaurus.config.js ./docusaurus.config.js
COPY --from=builder /app/babel.config.js ./babel.config.js
COPY --from=builder /app/umami.js ./umami.js
COPY --from=builder /app/src ./src

ARG PORT
ENV PORT=$PORT
ENV NODE_ENV=production

EXPOSE $PORT

CMD ["pnpm", "run", "coolify"]
