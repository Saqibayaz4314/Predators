import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
try {
  const tables = await pool.query(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  );
  const names = tables.rows.map((x) => x.tablename);
  console.log('Existing public tables:', names.length ? names.join(', ') : '(none)');
  const pgisRow = await pool.query('SELECT PostGIS_Version() AS v');
  console.log('PostGIS:', pgisRow.rows[0].v);
  const pgvRow = await pool.query('SELECT version() AS v');
  console.log('PG:', pgvRow.rows[0].v.split(' ').slice(0, 2).join(' '));
} finally {
  await pool.end();
}
