// Tipo que representa o perfil de um usuário.
export type UserProfile = {
  cpf: string;
  name: string;
  telefone: string;
  propriedade: string;
};

// Tipo que representa a atualização do perfil de um usuário.
// CPF nunca é editável — de propósito não existe "cpf" neste tipo.
export type UserProfileUpdate = {
  name: string;
  telefone: string;
  propriedade: string;
};