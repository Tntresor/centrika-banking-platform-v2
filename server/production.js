#!/usr/bin/env node

// Production entry point for Centrika Neobank Backend
// This file ensures proper deployment configuration

const cluster = require('cluster');
const os = require('os');

// Set production environment
process.env.NODE_ENV = 'production';

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// For deployment, we'll use a single process to keep resource usage minimal
// In production with higher loads, we could enable clustering

if (cluster.isMaster && process.env.ENABLE_CLUSTERING === 'true') {
  const numCPUs = Math.min(os.cpus().length, 2); // Limit to 2 workers max
  
  console.log(`Master ${process.pid} is running`);
  console.log(`Starting ${numCPUs} workers`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart worker
  });
} else {
  // Single process mode (default for deployment)
  require('./index.js');
}