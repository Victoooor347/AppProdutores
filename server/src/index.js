require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const precosRoutes = require('./routes/precos');
const cargasRoutes = require('./routes/cargas');
const relatoriosRoutes = require('./routes/relatorios');
const contraNotasRoutes = require('./routes/contraNotas');
const { STORAGE_DIR, gerarPdfContraNotaExemplo } = require('./services/pdfService');
const { asyncHandler } = require('./utils/asyncHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Serve os PDFs gerados. Protegido só pela imprevisibilidade do UUID do
// job (não exige login) — é assim porque o app abre esse link direto no
// navegador do celular (Linking.openURL), que não consegue mandar o header
// de Authorization. Suficiente por enquanto; se precisar de mais segurança
// depois, dá pra trocar por download autenticado via expo-file-system.
app.use('/arquivos/relatorios', express.static(STORAGE_DIR));

// PDFs de EXEMPLO das contra-notas do seed.sql (só desenvolvimento — na produção,
// o link de cada contra-nota aponta pro PDF real, vindo do ERP).
app.get('/arquivos/contra-notas/exemplo/:numero.pdf', asyncHandler(async (req, res) => {
  if (!/^[\w-]{1,20}$/.test(req.params.numero)) {
    return res.status(404).json({ message: 'Arquivo não encontrado.' });
  }
  const pdf = await gerarPdfContraNotaExemplo(req.params.numero);
  return res.type('application/pdf').send(pdf);
}));

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
  const status = err.status || err.statusCode || 500;
  // Erros 4xx são respostas esperadas (ex: código errado); só loga os problemas de verdade
  if (status >= 500) {
    console.error(err);
  }
  const message = status < 500 ? err.message : 'Erro interno no servidor.';
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});