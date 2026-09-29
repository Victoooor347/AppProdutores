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
