import { drizzle } from 'drizzle-orm/mysql2';
import { createPool } from 'mysql2/promise';
import * as schema from './schema.js';
const databaseUrl = process.env.DATABASE_URL ?? 'mysql://root@localhost:3306/academico_db';
const pool = createPool(databaseUrl);
export const db = drizzle(pool, {
    schema,
    mode: 'default',
});
export { pool };
