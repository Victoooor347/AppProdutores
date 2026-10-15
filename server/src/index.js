// Carrega o .env ANTES de tudo: a conexão com o banco (db.js) lê a DATABASE_URL ao ser criada
require('dotenv').config();
const { app } = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
