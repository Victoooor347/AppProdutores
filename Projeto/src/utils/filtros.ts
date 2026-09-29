// Opções do filtro de ano (Relatório de Safra e Contra-Notas): o ano atual e os 4 anteriores.
export const ANO_ATUAL = new Date().getFullYear();
export const ANOS = Array.from({ length: 5 }, (_, i) => String(ANO_ATUAL - i));
export const ANO_OPTIONS = ANOS.map((ano) => ({ label: ano, value: ano }));

// Período escolhido no calendário (datas "AAAA-MM-DD")
export type Periodo = { dataInicio?: string; dataFim?: string };
