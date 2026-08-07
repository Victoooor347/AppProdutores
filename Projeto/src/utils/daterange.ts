// Gera o objeto markedDates que o react-native-calendars espera pra pintar
// um período contínuo (markingType="period").
export function buildMarkedDates(
  start: string | undefined,
  end: string | undefined,
  color: string
): Record<string, any> {
  if (!start) return {};

  if (!end || end === start) {
    return {
      [start]: { startingDay: true, endingDay: true, color, textColor: '#fff' },
    };
  }

  // Gera um objeto com todas as datas entre start e end, marcadas com a cor fornecida.
  const marked: Record<string, any> = {};
  const current = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  // Marca cada dia do período como startingDay, endingDay ou apenas colorido.
  while (current <= endDate) {
    const iso = current.toISOString().slice(0, 10);
    marked[iso] = {
      color,
      textColor: '#fff',
      startingDay: iso === start,
      endingDay: iso === end,
    };
    current.setDate(current.getDate() + 1);
  }

  return marked;
}