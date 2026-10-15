import { describe, expect, it } from '@jest/globals';
import { calcularExpiracao, precisaRenovar } from '../sessao';

const HORA = 60 * 60 * 1000;
const AGORA = Date.UTC(2026, 9, 15, 12, 0, 0);

describe('calcularExpiracao', () => {
  it('soma o expires_in (segundos) ao momento atual', () => {
    expect(calcularExpiracao(86400, AGORA)).toBe(AGORA + 24 * HORA);
  });
});

describe('precisaRenovar', () => {
  it('sessão antiga, sem expiração salva: renova', () => {
    expect(precisaRenovar(undefined, AGORA)).toBe(true);
  });

  it('mais de 12h pela frente: não renova', () => {
    expect(precisaRenovar(AGORA + 20 * HORA, AGORA)).toBe(false);
  });

  it('menos de 12h pela frente: renova', () => {
    expect(precisaRenovar(AGORA + 11 * HORA, AGORA)).toBe(true);
  });

  it('já expirado: tenta renovar (a API responde 401 e o app volta pro login)', () => {
    expect(precisaRenovar(AGORA - HORA, AGORA)).toBe(true);
  });
});
