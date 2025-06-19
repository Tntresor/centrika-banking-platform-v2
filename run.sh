#!/bin/bash

# Production deployment script for Centrika Neobank Backend
set -e

echo "Starting Centrika Neobank Backend deployment..."

# Navigate to server directory
cd server

# Install dependencies
echo "Installing production dependencies..."
npm ci --only=production

# Set production environment
export NODE_ENV=production

# Start the server
echo "Starting backend server on port 8000..."
exec node index.js