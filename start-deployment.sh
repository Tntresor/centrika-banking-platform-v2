#!/bin/bash

# Centrika Neobank - Deployment Startup Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Centrika Neobank deployment..."

# Set production environment variables
export NODE_ENV=production
export PORT=${PORT:-8000}

echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "Database URL: $([ -n "$DATABASE_URL" ] && echo "Set" || echo "Not set")"

# Install server dependencies only (production)
echo "📦 Installing server dependencies..."
cd server
npm install --production --silent

# Start the backend server
echo "🌟 Starting backend server on port $PORT..."
exec npm start