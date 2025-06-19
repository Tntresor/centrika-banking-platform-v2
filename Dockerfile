# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ ./
COPY shared/ ./shared/

# Expose port 8000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 8000, path: '/health' }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Start the server
CMD ["npm", "start"]