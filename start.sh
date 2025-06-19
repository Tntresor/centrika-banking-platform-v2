#!/bin/bash

# Centrika Neobank - Production Start Script
# This script handles the deployment startup process

set -e

echo "Starting Centrika Neobank deployment..."

# Set production environment
export NODE_ENV=production
export PORT=8000

# Change to server directory
cd server

# Install dependencies
echo "Installing server dependencies..."
npm install --production

# Start the server
echo "Starting backend server on port 8000..."
exec npm run deploy