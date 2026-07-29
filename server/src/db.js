const { Pool } = require('pg');

// O Neon exige SSL. rejectUnauthorized: false evita problema com o
// certificado em ambiente de desenvolvimento — em produção, o ideal é
// validar o certificado direito (o Neon documenta como fazer isso).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = { pool };