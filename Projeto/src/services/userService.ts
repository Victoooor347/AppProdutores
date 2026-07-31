import { api, ApiError } from './api';
import { UserProfile, UserProfileUpdate } from '../types/userprofile';

export async function getProfile(token: string): Promise<UserProfile> {
  try {
    return await api.get<UserProfile>('/me', token);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockGetProfile();
    }
    throw error;
  }
}

export async function updateProfile(
  updates: UserProfileUpdate,
  token: string
): Promise<UserProfile> {
  try {
    return await api.put<UserProfile>('/me', updates, token);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockUpdateProfile(updates);
    }
    throw error;
  }
}

let mockProfile: UserProfile = {
  cpf: 'V',
  name: 'Produtor de Teste',
  telefone: '11999999999',
  propriedade: 'Fazenda Exemplo',
};

async function mockGetProfile(): Promise<UserProfile> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockProfile;
}

async function mockUpdateProfile(updates: UserProfileUpdate): Promise<UserProfile> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  mockProfile = { ...mockProfile, ...updates };
  return mockProfile;
}