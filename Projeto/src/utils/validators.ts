export const MIN_PASSWORD_LENGTH = 6;

// Aplica a máscara 000.000.000-00 enquanto o usuário digita.
export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Validação real de CPF: formato (11 dígitos) + dígitos verificadores.
// Evita erros de digitação chegarem até a API.
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 11) return false;
  // CPFs com todos os dígitos iguais (111.111.111-11 etc.) são inválidos.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcCheckDigit = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i], 10) * (factor - i);
    }
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };

  const firstCheck = calcCheckDigit(digits.slice(0, 9), 10);
  if (firstCheck !== parseInt(digits[9], 10)) return false;

  const secondCheck = calcCheckDigit(digits.slice(0, 10), 11);
  if (secondCheck !== parseInt(digits[10], 10)) return false;

  return true;
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}