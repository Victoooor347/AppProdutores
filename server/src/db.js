const { Pool } = require('pg');

// A conexão segue o "sslmode" da DATABASE_URL. Use sslmode=verify-full (ver .env.example):
// criptografa a conexão E confere o certificado do banco, então ninguém no meio do caminho
// consegue se passar pelo servidor do Neon.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };
