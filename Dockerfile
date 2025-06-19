# Centrika Neobank - Backend Only Dockerfile
# Optimized for Cloud Run deployment

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8000

# Copy server package files
COPY server/package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy server source code
COPY server/ ./
COPY shared/ ../shared/

# Expose port 8000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the server
CMD ["node", "production.js"]