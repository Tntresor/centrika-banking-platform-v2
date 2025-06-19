#!/bin/bash

# Deployment script for Centrika Neobank Backend
echo "Starting deployment..."

# Install dependencies
echo "Installing dependencies..."
cd server && npm install

# Start the backend server
echo "Starting backend server..."
exec npm start