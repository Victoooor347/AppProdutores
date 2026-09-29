import { describe, expect, it } from '@jest/globals';
import {
  formatCpf,
  isValidCodigo,
  isValidCpf,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
} from '../validators';

describe('formatCpf', () => {
  it('aplica a máscara 000.000.000-00 enquanto o usuário digita', () => {
    expect(formatCpf('529')).toBe('529');
    expect(formatCpf('5299')).toBe('529.9');
    expect(formatCpf('5299822')).toBe('529.982.2');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });

  it('ignora o que não é número e para no 11º dígito', () => {
    expect(formatCpf('abc529')).toBe('529');
    expect(formatCpf('529.982.247-2599')).toBe('529.982.247-25');
  });
});

describe('isValidCpf', () => {
  it('aceita CPFs com dígitos verificadores corretos, com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('111.444.777-35')).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('529.982.247-15')).toBe(false);
  });

  it('recusa CPF incompleto ou com todos os dígitos iguais', () => {
    expect(isValidCpf('529.982.247')).toBe(false);
    expect(isValidCpf('')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('000.000.000-00')).toBe(false);
  });
});

describe('isValidCodigo', () => {
  it('aceita exatamente 6 números', () => {
    expect(isValidCodigo('012345')).toBe(true);
  });

  it('recusa código incompleto, longo demais ou com letras', () => {
    expect(isValidCodigo('12345')).toBe(false);
    expect(isValidCodigo('1234567')).toBe(false);
    expect(isValidCodigo('12a456')).toBe(false);
    expect(isValidCodigo('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it(`exige no mínimo ${MIN_PASSWORD_LENGTH} caracteres`, () => {
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('123456')).toBe(true);
  });
});
