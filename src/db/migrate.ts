import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { config } from '../config/env';

async function migrate(): Promise<void> {
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.replace('.sql', '');
      const { rows } = await pool.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (rows.length === 0) {
        console.log(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        console.log(`Applied: ${file}`);
      } else {
        console.log(`Skipping (already applied): ${file}`);
      }
    }

    console.log('All migrations complete.');
  } finally {
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
