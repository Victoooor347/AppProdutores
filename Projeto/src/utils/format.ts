export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(isoDate: string): string {
  // Evita problema de fuso horário com datas "puras" (sem hora) tipo
  // "2026-07-27" — usamos os componentes direto da string em vez de
  // deixar o Date interpretar como UTC e "voltar um dia".
  const [year, month, day] = isoDate.split('T')[0].split('-');
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return new Date(isoDate).toLocaleDateString('pt-BR');
}

// Aplica a máscara DD/MM/AAAA enquanto o usuário digita.
export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

// Converte "DD/MM/AAAA" (já com a máscara aplicada) para "AAAA-MM-DD",
// formato que a API espera no filtro de data. Retorna undefined se a
// data ainda não estiver completa.
export function dateInputToIso(value: string): string | undefined {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}