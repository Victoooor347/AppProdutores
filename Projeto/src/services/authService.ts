import { api } from './api'; // Importa a instância da API, usada para fazer requisições HTTP.
import { CodigoEnviado, FinalidadeCodigo, User } from '../types/auth'; // Tipos do usuário autenticado e dos códigos enviados por e-mail.

export type LoginResponse = {
  user: User;
  token: string;
};

// A tela manda o CPF com máscara (000.000.000-00); a API recebe só os 11 dígitos.
function somenteDigitos(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

// A função `loginRequest` é responsável por enviar uma requisição de login para a API, recebendo o CPF e a senha do usuário.
export async function loginRequest(cpf: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', { cpf: somenteDigitos(cpf), password });
}

// A função `logoutRequest` avisa a API que a sessão acabou, para o token deixar de valer
// também no servidor (não só apagado do celular).
export async function logoutRequest(token: string): Promise<void> {
  await api.post('/auth/logout', {}, token);
}

// Rota da API de cada fluxo que usa código por e-mail
const ROTA_POR_FINALIDADE: Record<FinalidadeCodigo, string> = {
  primeiro_acesso: '/auth/primeiro-acesso',
  recuperar_senha: '/auth/recuperar-senha',
};

// Tipo que representa os dados brutos recebidos da API quando o código é enviado.
type RawCodigoEnviado = {
  email_mascarado: string;
  expira_em_segundos: number;
  reenviar_em_segundos: number;
};

// Pede um código por e-mail. A API manda para o e-mail que a empresa tem cadastrado
// para esse CPF e devolve o e-mail escondido em parte (ex: "jo****@gmail.com").
export async function solicitarCodigo(
  finalidade: FinalidadeCodigo,
  cpf: string
): Promise<CodigoEnviado> {
  const response = await api.post<RawCodigoEnviado>(
    `${ROTA_POR_FINALIDADE[finalidade]}/solicitar-codigo`,
    { cpf: somenteDigitos(cpf) }
  );
  return {
    emailMascarado: response.email_mascarado,
    expiraEmSegundos: response.expira_em_segundos,
    reenviarEmSegundos: response.reenviar_em_segundos,
  };
}

// Confirma o código e grava a senha nova. A API já devolve uma sessão, igual ao login.
export async function confirmarCodigo(
  finalidade: FinalidadeCodigo,
  cpf: string,
  codigo: string,
  password: string
): Promise<LoginResponse> {
  return api.post<LoginResponse>(`${ROTA_POR_FINALIDADE[finalidade]}/confirmar`, {
    cpf: somenteDigitos(cpf),
    codigo,
    password,
  });
}
