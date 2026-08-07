import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthContextData, User } from '../types/auth';
import { loginRequest } from '../services/authService';
import { ApiError } from '../services/api';

// Chave usada para armazenar a sessão do usuário no SecureStore do dispositivo
const SESSION_KEY = 'AppProdutores.session';

// Cria um contexto de autenticação para gerenciar o estado do usuário e do token de autenticação na aplicação.
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

type StoredSession = {
  user: User;
  token: string;
};

// Componente provedor de autenticação, responsável por fornecer o contexto de autenticação para os componentes filhos.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Estado local para armazenar o usuário autenticado, o token de autenticação e o estado de carregamento da sessão.
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  // Carrega a sessão salva no SecureStore do dispositivo, se houver, e atualiza o estado do usuário e do token.
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

  // Função para realizar o login do usuário, enviando as credenciais para a API e armazenando a sessão no SecureStore.
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

  // Função para realizar o logout do usuário, removendo a sessão do SecureStore e limpando o estado do usuário e do token.
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

// Hook personalizado para acessar o contexto de autenticação em outros componentes da aplicação.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  }

  return context;
}