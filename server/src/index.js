require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const precosRoutes = require('./routes/precos');
const cargasRoutes = require('./routes/cargas');
const relatoriosRoutes = require('./routes/relatorios');
const contraNotasRoutes = require('./routes/contraNotas');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/me', meRoutes);
app.use('/precos-do-dia', precosRoutes);
app.use('/cargas', cargasRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/contra-notas', contraNotasRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API do AppProdutores no ar.' });
});

// Handler de erro genérico — captura qualquer erro não tratado nas rotas
// (ex: falha de conexão com o banco) e devolve o formato de erro padrão
// do contrato, em vez de estourar uma stack trace pro cliente.
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Erro interno no servidor.';
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});