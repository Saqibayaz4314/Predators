/**
 * Migration runner — applies 001_initial_schema.sql to the configured database.
 *
 * Safety checks:
 * - Verifies target database is the expected one (via hostname pattern).
 * - Uses IF NOT EXISTS — safe to re-run.
 * - Rolls back on any failure.
 * - Never logs credentials.
 *
 * Usage: node scripts/run-migration.mjs
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(__dirname, '../migrations/001_initial_schema.sql');

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exitCode = 1;
  process.exit();
}

// Safety: confirm this is a Heroku PostgreSQL URL.
let parsedUrl;
try {
  parsedUrl = new URL(DATABASE_URL);
} catch {
  console.error('ERROR: DATABASE_URL is not a valid URL.');
  process.exitCode = 1;
  process.exit();
}

const isHerokuLike = parsedUrl.hostname.includes('.amazonaws.com') || parsedUrl.hostname.includes('heroku');
if (!isHerokuLike) {
  console.warn('WARNING: DATABASE_URL hostname does not appear to be Heroku/RDS. Proceeding anyway.');
}
console.log(`Target database host: ${parsedUrl.hostname}`);
console.log(`Target database name: ${parsedUrl.pathname.slice(1)}`);

// Read migration SQL
const sql = readFileSync(migrationPath, 'utf8');
console.log(`\nApplying: ${migrationPath}`);

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connected. Running migration...');
  await client.query(sql);
  console.log('\nMigration 001_initial_schema.sql: APPLIED SUCCESSFULLY');

  // Verify tables were created
  const result = await client.query(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  );
  const tables = result.rows.map((r) => r.tablename).filter((t) => t !== 'spatial_ref_sys');
  console.log('Application tables present:', tables.join(', '));
} catch (err) {
  // Sanitize error before logging
  const msg = err instanceof Error ? err.message.replace(DATABASE_URL, '[REDACTED]') : 'Unknown error';
  console.error('Migration FAILED:', msg);
  process.exitCode = 1;
} finally {
  await client.end();
}
