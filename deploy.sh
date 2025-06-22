#!/bin/bash

# Centrika Neobank - Deployment Script
# This script handles the complete deployment process for cloud platforms

set -e  # Exit on any error

echo "🚀 Starting Centrika Neobank deployment..."

# Set production environment variables
export NODE_ENV=production
export PORT=${PORT:-8000}

echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "Database URL: $([ -n "$DATABASE_URL" ] && echo "Connected" || echo "Not configured")"

# Navigate to server directory
cd server

# Install production dependencies
echo "📦 Installing server dependencies..."
npm install --production --silent

# Verify the server can start
echo "🔍 Verifying server configuration..."
if [ ! -f "simple-server.js" ]; then
    echo "❌ Error: simple-server.js not found"
    exit 1
fi

# Start the server
echo "🌟 Starting backend server on port $PORT..."
exec npm start