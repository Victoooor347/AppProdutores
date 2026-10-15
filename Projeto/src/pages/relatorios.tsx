import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import {
  getResumoCargas,
  listCargas,
  listarIdsCargas,
  gerarPdfCargas,
  consultarJobPdf,
  MAX_CARGAS_POR_PDF,
} from '../services/cargasService';
import { Carga, CargasFiltros, Cultura, ResumoCargas } from '../types/cargas';
import { formatDate } from '../utils/format';
import { ANO_ATUAL, ANO_OPTIONS, Periodo } from '../utils/filtros';
import { gerarEAbrirPdf } from '../utils/pdfJob';
import { useListaSelecionavel } from '../hooks/useListaSelecionavel';
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader';
import SelectField from '../components/SelectField';
import DateRangeField from '../components/DateRangeField';
import { style } from '../global/styles';

const CULTURA_OPTIONS = [
  { label: 'Todas', value: 'todas' as const },
  { label: 'Arroz', value: 'arroz' as const },
  { label: 'Soja', value: 'soja' as const },
];

// Quantas cargas buscar por vez. As próximas páginas são carregadas quando o
// usuário rola até o fim da lista.
const CARGAS_POR_PAGINA = 30;

// Fora do componente: o hook da lista espera funções que não mudam a cada render
function buscarPagina(filtros: CargasFiltros, page: number, token: string) {
  return listCargas({ ...filtros, page }, token);
}

export default function Relatorios() {
  const { token } = useAuth();

  const [ano, setAno] = useState(String(ANO_ATUAL));
  const [cultura, setCultura] = useState<Cultura | 'todas'>('todas');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('todas');
  const [periodo, setPeriodo] = useState<Periodo>({});

  // Resumo do ano (cards de total + opções do filtro de IE), junto com o ano a que ele
  // se refere. "dados: null" = a busca falhou.
  const [resumo, setResumo] = useState<{ ano: string; dados: ResumoCargas | null } | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filtros no formato que o service espera ("todas" vira "sem filtro")
  const filtros = useMemo<CargasFiltros>(
    () => ({
      ano: Number(ano),
      cultura: cultura === 'todas' ? undefined : cultura,
      inscricaoEstadual: inscricaoEstadual === 'todas' ? undefined : inscricaoEstadual,
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
      perPage: CARGAS_POR_PAGINA,
    }),
    [ano, cultura, inscricaoEstadual, periodo]
  );

  const lista = useListaSelecionavel<Carga, CargasFiltros>({
    token,
    filtros,
    buscarPagina,
    buscarTodosIds: listarIdsCargas,
    mensagemErroLista: 'Não foi possível carregar as cargas.',
    mensagemErroSelecao: 'Não foi possível selecionar todas as cargas.',
  });

  const isLoadingResumo = resumo?.ano !== ano;

  const inscricoesDoAno = resumo?.dados?.inscricoesEstaduais;
  const ieOptions = useMemo(
    () => [
      { label: 'IE', value: 'todas' },
      ...(inscricoesDoAno ?? []).map((ie) => ({ label: ie, value: ie })),
    ],
    [inscricoesDoAno]
  );

  // Busca o resumo do ano quando o ano muda (ou no pull-to-refresh da lista)
  useEffect(() => {
    if (!token) return;
    // Se o ano mudar antes da resposta chegar, a resposta antiga é descartada
    let cancelado = false;

    getResumoCargas(Number(ano), token)
      .then((dados) => {
        if (!cancelado) setResumo({ ano, dados });
      })
      .catch(() => {
        if (!cancelado) setResumo({ ano, dados: null });
      });

    return () => {
      cancelado = true;
    };
  }, [token, ano, lista.recarregamentos]);

  function handleAnoChange(novoAno: string) {
    setAno(novoAno);
    // As IEs disponíveis e as datas dependem do ano, então esses filtros também voltam ao padrão.
    setInscricaoEstadual('todas');
    setPeriodo({});
  }

  async function handleGerarPdf() {
    if (!token || lista.selectedIds.size === 0) return;

    setIsGeneratingPdf(true);
    await gerarEAbrirPdf(Array.from(lista.selectedIds), {
      maximo: MAX_CARGAS_POR_PDF,
      nomeItens: 'cargas',
      gerar: (ids) => gerarPdfCargas(ids, token),
      consultar: (jobId) => consultarJobPdf(jobId, token),
    });
    setIsGeneratingPdf(false);
  }

  // Mostra o total entregue de uma cultura no card de resumo
  function renderTotal(valorCultura: Cultura) {
    if (isLoadingResumo) {
      return (
        <ActivityIndicator
          size="small"
          color={themes.colors.verdeMedio}
          style={style.resumoLoadingRel}
        />
      );
    }
    if (!resumo?.dados) {
      return <Text style={style.resumoValueRel}>—</Text>;
    }

    const total = resumo.dados.totais.find((item) => item.cultura === valorCultura);
    return (
      <Text style={style.resumoValueRel}>
        {total?.totalSacas ?? 0}{' '}
        <Text style={style.resumoUnidadeRel}>{total?.unidade ?? 'sc'}</Text>
      </Text>
    );
  }

  return (
    <View style={style.screenRel}>
      <AppHeader title="Dickow Produtores" />

      {/* Conteúdo fixo, fora da rolagem. Fica sempre visível — só a lista mostra carregamento. */}
      <View style={style.titleRowRel}>
        <Text style={style.titleRel}>Relatório de Safra</Text>
        <SelectField label="Ano" value={ano} options={ANO_OPTIONS} onChange={handleAnoChange} />
      </View>

      <View style={style.resumoRowRel}>
        <View style={style.resumoCardRel}>
          <Text style={style.resumoLabelRel}>Total entregue - Arroz</Text>
          {renderTotal('arroz')}
        </View>
        <View style={style.resumoCardRel}>
          <Text style={style.resumoLabelRel}>Total entregue - Soja</Text>
          {renderTotal('soja')}
        </View>
      </View>

      <View style={style.filterBarRel}>
        <SelectField
          label="IE"
          value={inscricaoEstadual}
          options={ieOptions}
          onChange={setInscricaoEstadual}
        />
        <SelectField
          label="Cultura"
          value={cultura}
          options={CULTURA_OPTIONS}
          onChange={setCultura}
        />
        <DateRangeField value={periodo} onChange={setPeriodo} />
      </View>

      {!lista.isLoading && !lista.erro && (
        <View style={style.contadorRowRel}>
          <Text style={style.contadorRel}>
            {lista.totalItens === 1
              ? '1 carga encontrada'
              : `${lista.totalItens} cargas encontradas`}
          </Text>
          {lista.totalItens > 0 && (
            <Pressable
              style={style.selecionarTodasRel}
              onPress={lista.handleSelecionarTodas}
              disabled={lista.isSelecionandoTodas}
            >
              {lista.isSelecionandoTodas ? (
                <ActivityIndicator size="small" color={themes.colors.verdeMedio} />
              ) : (
                <Text style={style.selecionarTodasTextRel}>
                  {lista.todasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Só a lista de cargas rola, com pull-to-refresh e rolagem infinita */}
      <FlatList
        style={style.listaCargasRel}
        contentContainerStyle={style.contentRel}
        data={lista.isLoading || lista.erro ? [] : lista.itens}
        keyExtractor={(carga) => String(carga.id)}
        refreshControl={
          <RefreshControl
            refreshing={lista.isRefreshing}
            onRefresh={lista.handleRefresh}
            colors={[themes.colors.verdeMedio]}
          />
        }
        onEndReached={lista.handleFimDaLista}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          lista.isLoading ? (
            <View style={style.centeredRel}>
              <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
            </View>
          ) : lista.erro ? (
            <View style={style.errorBoxRel}>
              <Text style={style.errorTextRel}>{lista.erro}</Text>
              <Text style={style.errorHintRel}>Puxe a lista para baixo para tentar de novo.</Text>
            </View>
          ) : (
            <View style={style.emptyBoxRel}>
              <Text style={style.emptyTextRel}>Nenhuma carga encontrada para esse filtro.</Text>
            </View>
          )
        }
        ListFooterComponent={
          lista.isLoadingMais ? (
            <View style={style.footerListaRel}>
              <ActivityIndicator color={themes.colors.verdeMedio} />
            </View>
          ) : lista.erroMais ? (
            <Pressable style={style.footerListaRel} onPress={lista.carregarProximaPagina}>
              <Text style={style.retryTextRel}>
                Não foi possível carregar mais cargas. Toque para tentar de novo.
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item: carga }) => {
          const isSelected = lista.selectedIds.has(carga.id);
          return (
            <Pressable style={style.cargaRowRel} onPress={() => lista.toggleSelecao(carga.id)}>
              <View style={[style.checkboxRel, isSelected && style.checkboxSelectedRel]}>
                {isSelected && <Ionicons name="checkmark" size={14} color={themes.colors.branco} />}
              </View>
              <Text style={[style.cargaCellRel, style.cargaCellDataRel]}>
                {formatDate(carga.data)}
              </Text>
              <Text style={[style.cargaCellRel, style.cargaCellCulturaRel]}>
                {carga.cultura === 'arroz' ? 'Arroz' : 'Soja'}
              </Text>
              <Text style={[style.cargaCellRel, style.cargaCellSacasRel]}>
                {carga.quantidade} {carga.unidade}
              </Text>
              <Text style={[style.cargaCellRel, style.cargaCellPlacaRel]}>{carga.placa}</Text>
            </Pressable>
          );
        }}
      />

      <View style={style.footerRel}>
        <Pressable
          style={[
            style.pdfButtonRel,
            (lista.selectedIds.size === 0 || isGeneratingPdf) && style.pdfButtonDisabledRel,
          ]}
          disabled={lista.selectedIds.size === 0 || isGeneratingPdf}
          onPress={handleGerarPdf}
        >
          {isGeneratingPdf ? (
            <ActivityIndicator color={themes.colors.preto} size="small" />
          ) : (
            <Text style={style.pdfButtonTextRel}>
              Gerar PDF das cargas selecionadas
              {lista.selectedIds.size > 0 ? ` (${lista.selectedIds.size})` : ''}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
