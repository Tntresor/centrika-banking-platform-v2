# Production Dockerfile for Centrika Neobank Backend
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy server source code
COPY server/ ./

# Set production environment
ENV NODE_ENV=production
ENV PORT=8000

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "index.js"]