#!/bin/bash

# Centrika Neobank - Cloud Run Deployment Script
# Optimized for backend-only deployment

set -e

echo "=== Centrika Neobank - Cloud Run Deployment ==="

# Set production environment variables
export NODE_ENV=production
export PORT=8000

# Navigate to server directory
cd server

echo "Installing production dependencies..."
npm ci --only=production

echo "Running database push..."
npm run db:push || echo "Database push failed, continuing..."

echo "Starting Centrika Neobank API Server..."
exec node production.js