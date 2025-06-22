const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

const logger = new Logger('Migration');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    logger.info('Starting database migrations...');
    
    const migrationsDir = path.join(__dirname, '../migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('Migrations directory not found, creating it...');
      fs.mkdirSync(migrationsDir, { recursive: true });
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.info('No migration files found');
      return;
    }

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get already executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT filename FROM schema_migrations'
    );
    const executedFiles = executedMigrations.map(row => row.filename);

    for (const file of files) {
      if (executedFiles.includes(file)) {
        logger.info(`Skipping already executed migration: ${file}`);
        continue;
      }

      logger.info(`Executing migration: ${file}`);
      
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Execute migration in transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        logger.info(`Successfully executed migration: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    logger.info('All migrations completed successfully');
    
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    await pool.end();
  }
}

// Auto-run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed', { error: error.message });
      process.exit(1);
    });
}

module.exports = { runMigrations };