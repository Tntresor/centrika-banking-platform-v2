// server-enhanced.js - Application entry point with enterprise features
require('dotenv').config();

const { AppFactory } = require('./services/service-factory');
const { Logger } = require('./utils/logger');
const { CONFIG } = require('./config');
const { runMigrations } = require('./scripts/migrate');

const logger = new Logger('Server');

class Server {
  constructor() {
    this.appFactory = new AppFactory();
    this.server = null;
    this.isShuttingDown = false;
  }

  async start() {
    try {
      logger.info('Starting Centrika Banking API server...');

      // Run database migrations first
      if (process.env.AUTO_MIGRATE === 'true') {
        logger.info('Running database migrations...');
        await runMigrations();
      }

      // Create Express app with all services
      const app = await this.appFactory.createApp();

      // Start HTTP server
      this.server = app.listen(CONFIG.app.port, '0.0.0.0', () => {
        logger.info(`Server running on port ${CONFIG.app.port}`, {
          environment: CONFIG.app.env,
          port: CONFIG.app.port,
          url: `http://0.0.0.0:${CONFIG.app.port}`
        });
      });

      // Setup graceful shutdown
      this._setupGracefulShutdown();

      // Setup health monitoring
      this._setupHealthMonitoring();

      // Setup cleanup tasks
      this._setupCleanupTasks();

    } catch (error) {
      logger.error('Failed to start server', { error: error.message, stack: error.stack });
      process.exit(1);
    }
  }

  async stop() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down server...');

    try {
      // Stop accepting new connections
      if (this.server) {
        await new Promise((resolve, reject) => {
          this.server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
        logger.info('HTTP server closed');
      }

      // Shutdown services
      await this.appFactory.shutdown();
      logger.info('Services shutdown complete');

    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }

  _setupGracefulShutdown() {
    // Handle process termination signals
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM signal');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal');
      await this.stop();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { 
        error: error.message, 
        stack: error.stack,
        type: 'uncaughtException'
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { 
        reason: reason?.message || reason,
        promise: promise.toString(),
        type: 'unhandledRejection'
      });
      process.exit(1);
    });
  }

  _setupHealthMonitoring() {
    // Health check every 30 seconds
    const healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.appFactory.serviceFactory.healthCheck();
        if (health.status !== 'healthy') {
          logger.warn('Health check failed', { health });
        } else {
          logger.debug('Health check passed', { 
            services: Object.keys(health.services),
            responseTime: Math.max(...Object.values(health.services).map(s => s.responseTime))
          });
        }
      } catch (error) {
        logger.error('Health check error', { error: error.message });
      }
    }, 30000);

    // Clear interval on shutdown
    process.on('SIGTERM', () => clearInterval(healthCheckInterval));
    process.on('SIGINT', () => clearInterval(healthCheckInterval));
  }

  _setupCleanupTasks() {
    // Run cleanup tasks every hour
    const cleanupInterval = setInterval(async () => {
      try {
        logger.info('Running cleanup tasks...');
        
        const storageService = this.appFactory.serviceFactory.getService('storage');
        
        // Clean expired sessions (if function exists)
        try {
          const result = await storageService.pool.query('SELECT cleanup_expired_sessions()');
          logger.info('Cleaned expired sessions', { 
            deletedCount: result.rows[0]?.cleanup_expired_sessions || 0 
          });
        } catch (error) {
          logger.debug('Session cleanup function not available', { error: error.message });
        }
        
      } catch (error) {
        logger.error('Cleanup task failed', { error: error.message });
      }
    }, 3600000); // 1 hour

    // Clear interval on shutdown
    process.on('SIGTERM', () => clearInterval(cleanupInterval));
    process.on('SIGINT', () => clearInterval(cleanupInterval));
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    logger.error('Failed to start application', { error: error.message });
    process.exit(1);
  });
}

module.exports = { Server };