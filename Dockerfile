# Multi-stage build for Node.js application
FROM node:18-alpine AS base

# Install dependencies for backend
FROM base AS backend-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

# Build backend
FROM base AS backend
WORKDIR /app
COPY --from=backend-deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY shared ./shared

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 centrika

# Copy built application
COPY --from=backend --chown=centrika:nodejs /app ./

USER centrika

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

CMD ["node", "server/index.js"]