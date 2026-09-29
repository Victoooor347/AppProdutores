// Tipo que representa o perfil de um usuário.
export type UserProfile = {
  cpf: string;
  name: string;
  email: string; // para onde vão os códigos de acesso — só a empresa altera
  telefone: string;
  propriedade: string;
};

// Tipo que representa a atualização do perfil de um usuário.
// CPF e e-mail nunca são editáveis pelo app — de propósito não existem neste tipo.
export type UserProfileUpdate = {
  name: string;
  telefone: string;
  propriedade: string;
};
