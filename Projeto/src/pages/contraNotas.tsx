import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import {
  listContraNotas,
  listarIdsContraNotas,
  gerarPdfContraNotas,
  consultarJobPdfContraNotas,
  MAX_CONTRA_NOTAS_POR_PDF,
} from '../services/contranotasService';
import { ContraNota, ContraNotasFiltros } from '../types/contranotas';
import { formatDate } from '../utils/format';
import { ANO_ATUAL, ANO_OPTIONS, Periodo } from '../utils/filtros';
import { gerarEAbrirPdf } from '../utils/pdfJob';
import { useListaSelecionavel } from '../hooks/useListaSelecionavel';
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader';
import SelectField from '../components/SelectField';
import DateRangeField from '../components/DateRangeField';
import { style } from '../global/styles';

// Quantas contra-notas buscar por vez. As próximas páginas são carregadas quando o
// usuário rola até o fim da lista.
const NOTAS_POR_PAGINA = 20;

// Fora do componente: o hook da lista espera funções que não mudam a cada render
function buscarPagina(filtros: ContraNotasFiltros, page: number, token: string) {
  return listContraNotas({ ...filtros, page }, token);
}

export default function ContraNotas() {
  const { token } = useAuth();

  const [ano, setAno] = useState(String(ANO_ATUAL));
  const [periodo, setPeriodo] = useState<Periodo>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const filtros = useMemo<ContraNotasFiltros>(
    () => ({
      ano: Number(ano),
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
      perPage: NOTAS_POR_PAGINA,
    }),
    [ano, periodo]
  );

  const lista = useListaSelecionavel<ContraNota, ContraNotasFiltros>({
    token,
    filtros,
    buscarPagina,
    buscarTodosIds: listarIdsContraNotas,
    mensagemErroLista: 'Não foi possível carregar as contra-notas.',
    mensagemErroSelecao: 'Não foi possível selecionar todas as notas.',
  });

  function handleAnoChange(novoAno: string) {
    setAno(novoAno);
    setPeriodo({}); // o período escolhido era do ano anterior
  }

  // Abre o PDF de uma nota só
  async function handleBaixarPdf(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o PDF.');
    }
  }

  // Gera um PDF único com todas as notas selecionadas juntas
  async function handleGerarPdf() {
    if (!token || lista.selectedIds.size === 0) return;

    setIsGeneratingPdf(true);
    await gerarEAbrirPdf(Array.from(lista.selectedIds), {
      maximo: MAX_CONTRA_NOTAS_POR_PDF,
      nomeItens: 'contra-notas',
      gerar: (ids) => gerarPdfContraNotas(ids, token),
      consultar: (jobId) => consultarJobPdfContraNotas(jobId, token),
    });
    setIsGeneratingPdf(false);
  }

  return (
    <View style={style.screenCN}>
      <AppHeader title="Dickow Produtores" />

      {/* Conteúdo fixo, fora da rolagem: título, filtros e contador */}
      <View style={style.titleRowCN}>
        <Text style={style.titleCN}>Contra-Notas</Text>
        <SelectField label="Ano" value={ano} options={ANO_OPTIONS} onChange={handleAnoChange} />
      </View>

      <View style={style.filterBarCN}>
        <DateRangeField value={periodo} onChange={setPeriodo} />
      </View>

      {!lista.isLoading && !lista.erro && (
        <View style={style.contadorRowRel}>
          <Text style={style.contadorRel}>
            {lista.totalItens === 1 ? '1 nota encontrada' : `${lista.totalItens} notas encontradas`}
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

      <FlatList
        style={style.listaCN}
        contentContainerStyle={style.contentCN}
        data={lista.isLoading || lista.erro ? [] : lista.itens}
        keyExtractor={(item) => String(item.id)}
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
            <View style={style.centeredCN}>
              <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
            </View>
          ) : lista.erro ? (
            <View style={style.errorBoxCN}>
              <Text style={style.errorTextCN}>{lista.erro}</Text>
              <Text style={style.errorHintCN}>Puxe a lista para baixo para tentar de novo.</Text>
            </View>
          ) : (
            <View style={style.emptyBoxCN}>
              <Text style={style.emptyTextCN}>
                Nenhuma contra-nota encontrada para esse filtro.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          lista.isLoadingMais ? (
            <View style={style.footerListaCN}>
              <ActivityIndicator color={themes.colors.verdeMedio} />
            </View>
          ) : lista.erroMais ? (
            <Pressable style={style.footerListaCN} onPress={lista.carregarProximaPagina}>
              <Text style={style.retryTextCN}>
                Não foi possível carregar mais contra-notas. Toque para tentar de novo.
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => {
          const isSelected = lista.selectedIds.has(item.id);
          return (
            // Tocar no card marca/desmarca a nota; o "Baixar PDF" continua abrindo só ela
            <Pressable
              style={[style.cardCN, isSelected && style.cardSelectedCN]}
              onPress={() => lista.toggleSelecao(item.id)}
            >
              <View
                style={[
                  style.checkboxRel,
                  style.checkboxPosicaoCN,
                  isSelected && style.checkboxSelectedRel,
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color={themes.colors.branco} />}
              </View>
              <Text style={style.cardTitleCN}>NF - {item.numero}</Text>
              <Text style={style.cardDateCN}>{formatDate(item.dataEmissao)}</Text>
              <Pressable
                style={style.downloadButtonCN}
                onPress={() => handleBaixarPdf(item.arquivoPdfUrl)}
              >
                <Text style={style.downloadButtonTextCN}>Baixar PDF</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />

      {/* Mesmo botão do Relatório de Safra: junta as notas marcadas num PDF só */}
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
              Baixar PDF das notas selecionadas
              {lista.selectedIds.size > 0 ? ` (${lista.selectedIds.size})` : ''}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
