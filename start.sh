#!/bin/bash

# Production start script for Centrika Neobank Backend
echo "Starting Centrika Neobank Backend Server..."

# Set production environment
export NODE_ENV=production

# Navigate to server directory
cd server

# Install production dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci --only=production
fi

# Start the server
echo "Starting server on port ${PORT:-8000}..."
exec node index.js