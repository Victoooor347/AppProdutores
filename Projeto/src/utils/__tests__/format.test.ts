import { describe, expect, it } from '@jest/globals';
import { formatCurrency, formatDate, formatDateTime } from '../format';

// O toLocaleString usa um espaço especial (não separável) depois do "R$";
// aqui ele é trocado por um espaço comum só pra facilitar a comparação.
const semEspacoEspecial = (texto: string) => texto.replace(/\s/g, ' ');

describe('formatCurrency', () => {
  it('formata como real brasileiro', () => {
    expect(semEspacoEspecial(formatCurrency(63.2))).toBe('R$ 63,20');
    expect(semEspacoEspecial(formatCurrency(1234.5))).toBe('R$ 1.234,50');
  });
});

describe('formatDate', () => {
  it('formata data sem hora como DD/MM/AAAA', () => {
    expect(formatDate('2026-07-20')).toBe('20/07/2026');
  });

  it('usa o dia que está escrito, sem converter fuso (não "volta um dia")', () => {
    expect(formatDate('2026-07-20T00:00:00.000Z')).toBe('20/07/2026');
    expect(formatDate('2026-07-20T03:00:00.000Z')).toBe('20/07/2026');
  });
});

describe('formatDateTime', () => {
  it('converte para o horário local (testes rodam no fuso de São Paulo)', () => {
    const texto = formatDateTime('2026-09-29T11:00:00Z');
    expect(texto).toContain('29/09/2026');
    expect(texto).toContain('08:00');
  });
});
