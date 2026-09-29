// Tipo que representa o status do job de geração de PDF.
export type GerarPdfJobStatus = 'processando' | 'pronto' | 'erro';

// Tipo que representa o job de geração de PDF (relatório de cargas ou contra-notas juntas).
export type GerarPdfJob = {
  jobId: string;
  status: GerarPdfJobStatus;
  arquivoPdfUrl?: string;
};
