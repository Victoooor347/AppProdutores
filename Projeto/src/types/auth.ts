// Tipo que representa o usuário autenticado, contendo o CPF e opcionalmente o nome.
export type User = {
  cpf: string;
  name?: string;
};

// Para que serve o código enviado por e-mail: criar a primeira senha ou trocar uma esquecida.
export type FinalidadeCodigo = 'primeiro_acesso' | 'recuperar_senha';

// Resposta da API quando o código é enviado.
export type CodigoEnviado = {
  emailMascarado: string; // ex: "jo****@gmail.com"
  expiraEmSegundos: number; // validade do código
  reenviarEmSegundos: number; // quanto esperar para pedir outro
};

// Tipo que representa o contexto de autenticação, contendo informações sobre o usuário autenticado, token de autenticação, estado de autenticação e funções para login e logout.
export type AuthContextData = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (cpf: string, password: string) => Promise<void>;
  // Confirma o código do e-mail, grava a senha nova e já entra no app
  signInWithCode: (
    finalidade: FinalidadeCodigo,
    cpf: string,
    codigo: string,
    password: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
};
