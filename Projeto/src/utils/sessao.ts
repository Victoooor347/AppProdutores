// Regras de quando renovar o token da sessão (POST /auth/refresh).

// Renova quando faltar menos que isso pra expirar. A sessão da API dura 24h: quem abre o app
// todo dia renova sempre e nunca precisa digitar a senha de novo.
export const RENOVAR_QUANDO_FALTAR_MS = 12 * 60 * 60 * 1000;

// Momento em que o token expira (em ms, como Date.now()), a partir do expires_in da API
export function calcularExpiracao(expiresInSegundos: number, agora: number): number {
  return agora + expiresInSegundos * 1000;
}

// Sessão salva por uma versão antiga do app não tem a expiração: renova pra descobrir.
// Se o token já tiver expirado, a API responde 401 e o app volta pro login.
export function precisaRenovar(expiraEm: number | undefined, agora: number): boolean {
  if (expiraEm === undefined) return true;
  return expiraEm - agora < RENOVAR_QUANDO_FALTAR_MS;
}
