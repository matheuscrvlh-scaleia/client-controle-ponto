import { Pool } from 'pg';

export const db = new Pool({
    connectionString: process.env.SUPABASE_CONNECTION_STRING
})