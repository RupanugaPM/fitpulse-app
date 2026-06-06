import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function migrate() {
  const db = getDb();
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  console.log('Database migrated successfully.');
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  migrate();
}
