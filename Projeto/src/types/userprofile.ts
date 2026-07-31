export type UserProfile = {
  cpf: string;
  name: string;
  telefone: string;
  propriedade: string;
};

// CPF nunca é editável — de propósito não existe "cpf" neste tipo.
export type UserProfileUpdate = {
  name: string;
  telefone: string;
  propriedade: string;
};