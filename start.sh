#!/bin/bash

# Optimized deployment script for Replit Cloud Run
set -e

echo "Centrika Neobank Backend - Starting deployment"

# Navigate to server directory
cd server

# Install only production dependencies (faster deployment)
echo "Installing production dependencies..."
npm ci --only=production --silent

# Set production environment
export NODE_ENV=production
export PORT=8000

# Start the server
echo "Starting server on port 8000..."
exec node index.js