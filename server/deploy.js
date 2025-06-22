#!/usr/bin/env node

// Simple deployment entry point without child process complexity
// This eliminates the connection refused errors caused by start.js wrapper

console.log('🚀 Centrika Banking - Direct Deployment Entry Point');
console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`Host: ${process.env.HOST || '0.0.0.0'}`);
console.log(`Port: ${process.env.PORT || '8001'}`);

// Set production environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.PORT = process.env.PORT || '8001';

// Directly require and start the production server
require('./production-server.js');