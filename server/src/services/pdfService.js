const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { PDFDocument: PdfLibDocument } = require('pdf-lib');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'relatorios');

// Garante que a pasta existe (não é versionada no git — ver .gitignore).
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const NOMES_CULTURA = { arroz: 'Arroz', soja: 'Soja' };

function formatDataBR(data) {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Gera o PDF do relatório de cargas selecionadas e salva em disco.
 * @param {{ jobId: string, produtor: {cpf: string, name: string, propriedade: string}, cargas: Array }} params
 * @returns {Promise<string>} caminho absoluto do arquivo gerado
 */
function gerarPdfRelatorioCargas({ jobId, produtor, cargas }) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(STORAGE_DIR, `${jobId}.pdf`);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Cabeçalho
    doc.fontSize(18).fillColor('#1a5c2e').text('Dickow Alimentos', { continued: false });
    doc.fontSize(14).fillColor('#000').text('Relatório de Cargas', { paragraphGap: 4 });
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor('#444');
    doc.text(`Produtor: ${produtor.name}  (CPF: ${produtor.cpf})`);
    if (produtor.propriedade) {
      doc.text(`Propriedade: ${produtor.propriedade}`);
    }
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    doc.moveDown(1);

    // Cabeçalho da tabela
    const colX = { data: 40, cultura: 130, quantidade: 220, ie: 320, placa: 430 };
    const tableTop = doc.y;

    doc.fontSize(10).fillColor('#fff');
    doc.rect(40, tableTop, 515, 20).fill('#1a5c2e');
    doc.fillColor('#fff');
    doc.text('Data', colX.data + 4, tableTop + 5);
    doc.text('Cultura', colX.cultura + 4, tableTop + 5);
    doc.text('Quantidade', colX.quantidade + 4, tableTop + 5);
    doc.text('IE', colX.ie + 4, tableTop + 5);
    doc.text('Placa', colX.placa + 4, tableTop + 5);

    let y = tableTop + 20;
    const totaisPorCultura = {};

    cargas.forEach((carga, index) => {
      const rowHeight = 20;
      if (y + rowHeight > 780) {
        doc.addPage();
        y = 40;
      }

      if (index % 2 === 0) {
        doc.rect(40, y, 515, rowHeight).fill('#f2f2f2');
      }
      doc.fillColor('#000').fontSize(9);
      doc.text(formatDataBR(carga.data), colX.data + 4, y + 5);
      doc.text(NOMES_CULTURA[carga.cultura] || carga.cultura, colX.cultura + 4, y + 5);
      doc.text(`${carga.quantidade} ${carga.unidade}`, colX.quantidade + 4, y + 5);
      doc.text(carga.inscricao_estadual, colX.ie + 4, y + 5);
      doc.text(carga.placa, colX.placa + 4, y + 5);

      totaisPorCultura[carga.cultura] =
        (totaisPorCultura[carga.cultura] || 0) + Number(carga.quantidade);

      y += rowHeight;
    });

    // Totais
    y += 16;
    doc.fontSize(11).fillColor('#1a5c2e').text('Totais', 40, y);
    y += 18;
    Object.entries(totaisPorCultura).forEach(([cultura, total]) => {
      doc.fontSize(10).fillColor('#000');
      doc.text(`${NOMES_CULTURA[cultura] || cultura}: ${total} sc`, 40, y);
      y += 16;
    });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Gera o PDF de EXEMPLO de uma contra-nota (só pra desenvolvimento: as contra-notas de
 * verdade são PDFs que vêm do ERP). Usado pelos links de teste do seed.sql.
 * @param {string} numero número da nota
 * @returns {Promise<Buffer>}
 */
function gerarPdfContraNotaExemplo(numero) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const partes = [];
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    doc.fontSize(18).fillColor('#1a5c2e').text('Dickow Alimentos');
    doc.fontSize(14).fillColor('#000').text(`Contra-nota Nº ${numero}`, { paragraphGap: 4 });
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#9E9E9E');
    doc.text('Documento de EXEMPLO gerado pela API de teste.');
    doc.text('Na API de produção, este PDF é a contra-nota real, vinda do ERP.');
    doc.end();
  });
}

/**
 * Junta vários PDFs (na ordem recebida) em um arquivo só e salva em disco,
 * na mesma pasta dos relatórios (servida em /arquivos/relatorios).
 * @param {{ jobId: string, pdfs: Buffer[] }} params
 * @returns {Promise<string>} caminho absoluto do arquivo gerado
 */
async function juntarPdfs({ jobId, pdfs }) {
  const final = await PdfLibDocument.create();

  for (const bytes of pdfs) {
    const origem = await PdfLibDocument.load(bytes);
    const paginas = await final.copyPages(origem, origem.getPageIndices());
    paginas.forEach((pagina) => final.addPage(pagina));
  }

  const filePath = path.join(STORAGE_DIR, `${jobId}.pdf`);
  await fs.promises.writeFile(filePath, await final.save());
  return filePath;
}

module.exports = { gerarPdfRelatorioCargas, gerarPdfContraNotaExemplo, juntarPdfs, STORAGE_DIR };