import postgres from 'postgres';

// Lazy singleton. CONNECTION ONLY HAPPENS ON FIRST QUERY.
// This allows SMOKE_MODE to skip DATABASE_URL during boot probes.
let _sql = null;
export function getSql() {
  if (!_sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }
    _sql = postgres(databaseUrl, { max: 10 });
  }
  return _sql;
}
