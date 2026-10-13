import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
// Check the isfinite signature for doubles
const r = await client.query(`
  SELECT proname, pg_get_function_arguments(oid) as args
  FROM pg_proc
  WHERE proname = 'isfinite'
  ORDER BY oid
`);
console.log('isfinite functions:', JSON.stringify(r.rows, null, 2));
await client.end();
