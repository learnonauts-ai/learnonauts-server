/** @type {import('drizzle-kit').Config} */
export default {
  schema: './db/schema.js',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
  }
};