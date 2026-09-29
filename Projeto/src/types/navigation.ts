import { FinalidadeCodigo } from './auth';

// Telas do navegador principal (routes/index.routes.tsx) e os parâmetros que cada uma recebe.
// O TypeScript usa isso pra conferir o navigation.navigate(...) e o route.params das telas.
export type RootStackParamList = {
  // Área logada (abas)
  BottomRoutes: undefined;

  // Área sem login
  Login: undefined;
  SolicitarCodigo: {
    finalidade: FinalidadeCodigo;
    cpf?: string; // CPF já digitado na tela de login, se houver
  };
  ConfirmarCodigo: {
    finalidade: FinalidadeCodigo;
    cpf: string;
    emailMascarado: string;
    expiraEmSegundos: number;
    reenviarEmSegundos: number;
  };
};
