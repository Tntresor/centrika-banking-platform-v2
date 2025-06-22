#!/usr/bin/env node

// Centrika Neobank - Production Start Script
// This ensures the server starts correctly in deployment environments

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Centrika Neobank - Starting production server...');

// Set production environment
process.env.NODE_ENV = 'production';

// Ensure we're in the correct directory
const serverDir = __dirname;
process.chdir(serverDir);

console.log(`Working directory: ${process.cwd()}`);
console.log(`Node version: ${process.version}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Host: ${process.env.HOST || '0.0.0.0'}`);
console.log(`Port: ${process.env.PORT || 8000}`);

// Start the server
const serverProcess = spawn('node', ['simple-server.js'], {
  stdio: 'inherit',
  cwd: serverDir,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: process.env.HOST || '0.0.0.0',
    PORT: process.env.PORT || '8000'
  }
});

// Handle process events
serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code} and signal ${signal}`);
    process.exit(code || 1);
  }
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGTERM');
});