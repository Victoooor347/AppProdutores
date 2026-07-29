import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthContextData, User } from '../types/auth';
import { loginRequest } from '../services/authService';
import { ApiError } from '../services/api';

// Chave usada para guardar a sessão no armazenamento seguro do dispositivo.
// Nunca use AsyncStorage puro para dados sensíveis como CPF/token.
const SESSION_KEY = 'AppProdutores.session';

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

type StoredSession = {
  user: User;
  token: string;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // isLoading representa o "boot" do app: enquanto verificamos se já existe
  // uma sessão salva no dispositivo, não decidimos ainda para qual tela ir.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      if (raw) {
        const session: StoredSession = JSON.parse(raw);
        setUser(session.user);
        setToken(session.token);
      }
    } catch (error) {
      console.error('Erro ao carregar sessão salva:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(cpf: string, password: string) {
    if (!cpf || !password) {
      throw new Error('Por favor, preencha todos os campos.');
    }

    try {
      const { user: authenticatedUser, token } = await loginRequest(cpf, password);

      await SecureStore.setItemAsync(
        SESSION_KEY,
        JSON.stringify({ user: authenticatedUser, token } as StoredSession)
      );

      setUser(authenticatedUser);
      setToken(token);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.message ?? 'Não foi possível fazer login.');
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  }

  return context;
}