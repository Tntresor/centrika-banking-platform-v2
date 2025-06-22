#!/usr/bin/env node

// Main deployment entry point for Centrika Banking API
// This ensures the server starts properly on port 8000 for deployment

const path = require('path');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '8000';

console.log('🚀 Centrika Banking API - Deployment Entry Point');
console.log(`Starting server on ${process.env.HOST}:${process.env.PORT}`);

// Import and start the optimized server
require('./server/optimized-server.js');