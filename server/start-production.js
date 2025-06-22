#!/usr/bin/env node

// Alternative production startup script
// Ensures all environment variables are properly set

console.log('🚀 Centrika Neobank - Production Startup');

// Set critical environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '8003';

console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.PORT}`);
console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);

// Start the main application
require('./production.js');