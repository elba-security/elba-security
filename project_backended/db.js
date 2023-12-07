const { Pool } = require('pg');
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'elba',
  password: process.env.DB_PASSWORD || '1234',
  port: process.env.DB_PORT || 5432,
};

const connectDB = () => {
  const pool = new Pool(dbConfig);

  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err.stack);
    process.exit(-1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    pool.end(() => {
      console.log('Database pool has been closed.');
      process.exit(0);
    });
  });

  return pool;
};

module.exports = { connectDB };
