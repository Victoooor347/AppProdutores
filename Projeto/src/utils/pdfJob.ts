import { Alert, Linking } from 'react-native';
import { GerarPdfJob } from '../types/pdf';

// Controle da espera pelo PDF: consulta a cada 1,5s, por até ~30s no total
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_TENTATIVAS = 20;

// Espera o PDF ficar pronto: enquanto a API responder "processando", consulta de novo.
// Devolve o job no estado final ("pronto", "erro") ou ainda "processando", se passou do tempo.
export async function aguardarPdfPronto(
  job: GerarPdfJob,
  consultar: (jobId: string) => Promise<GerarPdfJob>
): Promise<GerarPdfJob> {
  let atual = job;
  let tentativas = 0;

  while (atual.status === 'processando' && tentativas < POLL_MAX_TENTATIVAS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    atual = await consultar(atual.jobId);
    tentativas += 1;
  }

  return atual;
}

// Abre o PDF pronto no celular, ou avisa o produtor do que aconteceu.
export async function abrirPdfGerado(job: GerarPdfJob): Promise<void> {
  if (job.status === 'pronto' && job.arquivoPdfUrl) {
    await Linking.openURL(job.arquivoPdfUrl);
  } else if (job.status === 'erro') {
    Alert.alert('Erro', 'Não foi possível gerar o PDF. Tente novamente.');
  } else {
    Alert.alert(
      'Ainda processando',
      'A geração do PDF está demorando mais que o esperado. Tente novamente em instantes.'
    );
  }
}

type OpcoesGerarPdf = {
  // Máximo de itens que a API aceita num PDF só (ver contrato-api.md)
  maximo: number;
  // Como chamar os itens na mensagem de limite, no plural: "cargas", "contra-notas"
  nomeItens: string;
  gerar: (ids: string[]) => Promise<GerarPdfJob>;
  consultar: (jobId: string) => Promise<GerarPdfJob>;
};

// Fluxo completo do botão de PDF: confere o limite, pede o PDF, espera ficar pronto e abre.
// Qualquer problema vira um alerta pro produtor — quem chama só precisa mostrar o carregamento.
export async function gerarEAbrirPdf(
  ids: string[],
  { maximo, nomeItens, gerar, consultar }: OpcoesGerarPdf
): Promise<void> {
  // Confere antes de chamar a API, pra explicar o limite em vez de mostrar só o erro
  if (ids.length > maximo) {
    Alert.alert(
      'Seleção grande demais',
      `O PDF aceita no máximo ${maximo} ${nomeItens}, e você marcou ${ids.length}. ` +
        'Use os filtros para diminuir a seleção.'
    );
    return;
  }

  try {
    const job = await gerar(ids);
    const final = await aguardarPdfPronto(job, consultar);
    await abrirPdfGerado(final);
  } catch (error: any) {
    Alert.alert('Erro', error?.message ?? 'Não foi possível gerar o PDF.');
  }
}
