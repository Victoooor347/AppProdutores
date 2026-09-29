import { api } from './api'; // Importa a instância da API, usada para fazer requisições HTTP.
import { UserProfile, UserProfileUpdate } from '../types/userprofile'; // Importa os tipos UserProfile e UserProfileUpdate que definem a estrutura do perfil do usuário e as atualizações possíveis no perfil.

// Tipo que representa os dados brutos do perfil recebidos da API
// (e-mail, telefone e propriedade podem vir null quando não foram preenchidos).
type RawUserProfile = {
  cpf: string;
  name: string | null;
  email?: string | null;
  telefone: string | null;
  propriedade: string | null;
};

// Função que mapeia o perfil bruto da API para o formato do app, trocando null por texto vazio
// (os campos da tela sempre trabalham com string).
function mapProfile(raw: RawUserProfile): UserProfile {
  return {
    cpf: raw.cpf,
    name: raw.name ?? '',
    email: raw.email ?? '',
    telefone: raw.telefone ?? '',
    propriedade: raw.propriedade ?? '',
  };
}

// Função que busca o perfil do usuário autenticado, retornando os dados do perfil.
export async function getProfile(token: string): Promise<UserProfile> {
  return mapProfile(await api.get<RawUserProfile>('/me', token));
}

// Função que atualiza o perfil do usuário autenticado com os dados fornecidos, retornando o perfil atualizado.
export async function updateProfile(
  updates: UserProfileUpdate,
  token: string
): Promise<UserProfile> {
  return mapProfile(await api.put<RawUserProfile>('/me', updates, token));
}
