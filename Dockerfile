# -------------------------
# 1) Build stage
# -------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source files
COPY . .

# Generate files and build
RUN npm run generateAuthors && npm run generateAudioFeed && npm run coolify-build

# -------------------------
# 2) Production stage
# -------------------------
FROM node:22-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --production --silent && npm cache clean --force

# Copy built application from builder stage (only the built files)
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static
COPY --from=builder /app/docusaurus.config.js ./docusaurus.config.js
COPY --from=builder /app/babel.config.js ./babel.config.js

ARG PORT
ENV PORT=$PORT
ENV NODE_ENV=production

EXPOSE $PORT

# Add healthcheck for Coolify
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/ || exit 1

CMD ["npm", "run", "coolify"]
