import { describe, expect, it } from '@jest/globals';
import { buildMarkedDates } from '../daterange';

const VERDE = '#0d8241';

describe('buildMarkedDates', () => {
  it('sem data inicial, não marca nada', () => {
    expect(buildMarkedDates(undefined, undefined, VERDE)).toEqual({});
  });

  it('só com a data inicial, marca um dia (início e fim ao mesmo tempo)', () => {
    expect(buildMarkedDates('2026-03-10', undefined, VERDE)).toEqual({
      '2026-03-10': { startingDay: true, endingDay: true, color: VERDE, textColor: '#fff' },
    });
  });

  it('com início e fim, marca todos os dias do período', () => {
    const marcados = buildMarkedDates('2026-02-27', '2026-03-02', VERDE);

    // Passa pela virada de fevereiro pra março (2026 não é bissexto)
    expect(Object.keys(marcados)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(marcados['2026-02-27'].startingDay).toBe(true);
    expect(marcados['2026-02-28']).toMatchObject({ startingDay: false, endingDay: false });
    expect(marcados['2026-03-02'].endingDay).toBe(true);
  });
});
