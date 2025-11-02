import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

// Create the SQLite database instance
const sqlite = new Database('sqlite.db');

// Create the Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export the schema
export { schema };