import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from 'pg';

const { Pool } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


// Parse the connection string to extract components
const url = new URL(process.env.POSTGRES_URL);

const pool = new Pool({
  user: url.username,
  password: url.password,
  host: url.hostname,
  port: parseInt(url.port),
  database: url.pathname.slice(1),
  ssl: {
    rejectUnauthorized: false
  }
});

export const db = drizzle(pool);