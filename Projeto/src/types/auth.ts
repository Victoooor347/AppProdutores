export type User = {
  cpf: string;
  name?: string;
};

export type AuthContextData = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (cpf: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export type SignInResult = {
  success: boolean;
  message?: string;
};