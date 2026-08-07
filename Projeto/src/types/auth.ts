// Tipo que representa o usuário autenticado, contendo o CPF e opcionalmente o nome.
export type User = {
  cpf: string;
  name?: string;
};

// Tipo que representa o contexto de autenticação, contendo informações sobre o usuário autenticado, token de autenticação, estado de autenticação e funções para login e logout.
export type AuthContextData = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (cpf: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Tipo que representa o resultado de uma tentativa de login, contendo um indicador de sucesso e opcionalmente uma mensagem de erro.
export type SignInResult = {
  success: boolean;
  message?: string;
};