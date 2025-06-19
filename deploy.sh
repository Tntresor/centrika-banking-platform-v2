#!/bin/bash

# Centrika Neobank - Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Centrika Neobank deployment..."

# Navigate to server directory
cd server

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Set environment variables
export NODE_ENV=production
export PORT=${PORT:-8000}

# Start the server
echo "🌟 Starting production server on port $PORT..."
npm run deploy