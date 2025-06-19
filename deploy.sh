#!/bin/bash

# Production deployment script for Centrika Neobank Backend
set -euo pipefail

echo "🚀 Starting Centrika Neobank Backend deployment..."

# Navigate to server directory
cd server

# Install production dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Set production environment variables
export NODE_ENV=production
export PORT=8000

# Verify server file exists
if [ ! -f "index.js" ]; then
    echo "❌ Error: index.js not found in server directory"
    exit 1
fi

# Start the backend server
echo "🌐 Starting backend server on port 8000..."
echo "✅ Health check available at: http://0.0.0.0:8000/health"
echo "✅ API endpoint available at: http://0.0.0.0:8000/"

exec node index.js