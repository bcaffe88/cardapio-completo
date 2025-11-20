import { Pool } from 'pg';

// Create a connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Export a function to get a client from the pool
export const getClient = async () => {
  return await pool.connect();
};

// Export a function to execute queries directly
export const query = async (text: string, params: any[] = []) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
};
