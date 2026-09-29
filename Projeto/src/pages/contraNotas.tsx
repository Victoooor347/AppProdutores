import React, { useEffect, useMemo, useRef, useState } from 'react'; // Importa o React e os hooks para gerenciar o estado e os efeitos colaterais do componente
import {
  View,
  Text,
  ActivityIndicator, // Componente que exibe um indicador de carregamento (spinner)
  RefreshControl, // Componente que permite adicionar funcionalidade de "pull to refresh" em listas
  Linking, // Componente que permite abrir URLs externas, como links para PDFs
  Alert, // Componente para exibir alertas e mensagens de erro
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Ícone de "marcado" da caixinha de seleção
import { useAuth } from '../context/authContext'; // Importa o hook useAuth do contexto de autenticação para acessar funções e estados relacionados à autenticação
import {
  listContraNotas,
  listarIdsContraNotas,
  gerarPdfContraNotas,
  consultarJobPdfContraNotas,
} from '../services/contranotasService'; // Funções de serviço das contra-notas: listar, selecionar todas e gerar o PDF único
import { ContraNota, ContraNotasFiltros } from '../types/contranotas'; // Importa os tipos das contra-notas e dos filtros
import { formatDate } from '../utils/format'; // Importa a função formatDate para formatar datas em um formato legível para o usuário
import { ANO_ATUAL, ANO_OPTIONS, Periodo } from '../utils/filtros'; // Opções do filtro de ano e tipo do período
import { abrirPdfGerado, aguardarPdfPronto } from '../utils/pdfJob'; // Espera o PDF ficar pronto e abre
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader'; // Importa o componente AppHeader para exibir o cabeçalho da tela
import SelectField from '../components/SelectField'; // Campo de seleção (filtro de ano)
import DateRangeField from '../components/DateRangeField'; // Campo de período com calendário
import { style } from '../global/styles';

// Quantas contra-notas buscar por vez. As próximas páginas são carregadas quando o
// usuário rola até o fim da lista.
const NOTAS_POR_PAGINA = 20;

export default function ContraNotas() {
  // Importa o token de autenticação do contexto de autenticação para autorizar as requisições à API
  const { token } = useAuth();

  // Filtros
  const [ano, setAno] = useState(String(ANO_ATUAL));
  const [periodo, setPeriodo] = useState<Periodo>({});

  // Lista de contra-notas, carregada de página em página. Depende dos filtros.
  const [contraNotas, setContraNotas] = useState<ContraNota[]>([]);
  const [paginacao, setPaginacao] = useState({ pagina: 1, totalPaginas: 1, totalNotas: 0 });
  // Filtros da última página 1 que chegou da API (ver isLoading abaixo)
  const [filtrosCarregados, setFiltrosCarregados] = useState<ContraNotasFiltros | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingMais, setIsLoadingMais] = useState(false);
  const [erroMais, setErroMais] = useState(false);

  // Pull-to-refresh: incrementar o contador faz a lista buscar a página 1 de novo
  const [recarregamentos, setRecarregamentos] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Seleção de notas e geração do PDF único
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecionandoTodas, setIsSelecionandoTodas] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Contadores de busca: a resposta só é usada se ainda for a mais recente
  // (ex: trocar de filtro no meio de uma busca descarta a resposta antiga).
  const requestRef = useRef(0);
  const selecaoRequestRef = useRef(0);

  // Filtros no formato que o service espera
  const filtros = useMemo<ContraNotasFiltros>(
    () => ({
      ano: Number(ano),
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
      perPage: NOTAS_POR_PAGINA,
    }),
    [ano, periodo]
  );

  // "Está carregando" é calculado: enquanto o resultado que temos for de outro filtro,
  // mostra o carregamento no lugar da lista.
  const isLoading = filtrosCarregados !== filtros;

  // Busca a página 1 sempre que um filtro muda (ou no pull-to-refresh)
  useEffect(() => {
    if (!token) return;
    const requestId = ++requestRef.current;

    listContraNotas({ ...filtros, page: 1 }, token)
      .then((response) => {
        if (requestId !== requestRef.current) return;
        setContraNotas(response.data);
        setPaginacao({
          pagina: response.pagination.page,
          totalPaginas: response.pagination.totalPages,
          totalNotas: response.pagination.totalItems,
        });
        setErrorMessage(null);
      })
      .catch((error) => {
        if (requestId !== requestRef.current) return;
        setErrorMessage(error?.message ?? 'Não foi possível carregar as contra-notas.');
      })
      .finally(() => {
        if (requestId !== requestRef.current) return;
        setFiltrosCarregados(filtros);
        setIsRefreshing(false);
        // Se havia uma "próxima página" carregando, ela foi descartada por esta busca
        setIsLoadingMais(false);
        setErroMais(false);
      });
  }, [token, filtros, recarregamentos]);

  // Busca a próxima página e adiciona no fim da lista (rolagem infinita)
  async function carregarProximaPagina() {
    if (!token) return;
    const requestId = ++requestRef.current;
    setIsLoadingMais(true);
    setErroMais(false);

    try {
      const response = await listContraNotas({ ...filtros, page: paginacao.pagina + 1 }, token);
      if (requestId !== requestRef.current) return;

      setContraNotas((anteriores) => {
        // Evita repetir uma nota que apareça em duas páginas (ex: nota nova
        // emitida enquanto o usuário rolava a lista).
        const idsCarregados = new Set(anteriores.map((nota) => nota.id));
        return [...anteriores, ...response.data.filter((nota) => !idsCarregados.has(nota.id))];
      });
      setPaginacao({
        pagina: response.pagination.page,
        totalPaginas: response.pagination.totalPages,
        totalNotas: response.pagination.totalItems,
      });
    } catch {
      if (requestId !== requestRef.current) return;
      setErroMais(true);
    } finally {
      if (requestId === requestRef.current) setIsLoadingMais(false);
    }
  }

  // Chamada pela lista quando o usuário chega perto do fim: busca a próxima página, se houver
  function handleFimDaLista() {
    if (isLoading || isRefreshing || isLoadingMais || erroMais || errorMessage) return;
    if (paginacao.pagina >= paginacao.totalPaginas) return;
    carregarProximaPagina();
  }

  // Função para lidar com a atualização da lista de contra-notas (pull-to-refresh)
  function handleRefresh() {
    setIsRefreshing(true);
    setRecarregamentos((n) => n + 1);
  }

  // Desmarca tudo (e cancela um "Selecionar todas" que ainda esteja buscando)
  function limparSelecao() {
    selecaoRequestRef.current += 1;
    setIsSelecionandoTodas(false);
    setSelectedIds(new Set());
  }

  // Trocar de filtro limpa a seleção: as notas marcadas podem não fazer parte do novo resultado.
  function handleAnoChange(novoAno: string) {
    setAno(novoAno);
    setPeriodo({}); // o período escolhido era do ano anterior
    limparSelecao();
  }

  function handlePeriodoChange(novoPeriodo: Periodo) {
    setPeriodo(novoPeriodo);
    limparSelecao();
  }

  // Função para marcar/desmarcar uma nota
  function toggleSelecao(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Todas as notas do filtro já estão marcadas?
  const todasSelecionadas = paginacao.totalNotas > 0 && selectedIds.size >= paginacao.totalNotas;

  // "Selecionar todas" marca TODAS as notas do filtro, inclusive as que ainda não
  // apareceram na rolagem. Se já estão todas marcadas, o botão desmarca.
  async function handleSelecionarTodas() {
    if (!token) return;
    if (todasSelecionadas) {
      limparSelecao();
      return;
    }

    // Se a lista já carregou tudo, não precisa ir na API
    if (contraNotas.length >= paginacao.totalNotas) {
      setSelectedIds(new Set(contraNotas.map((nota) => nota.id)));
      return;
    }

    const requestId = ++selecaoRequestRef.current;
    setIsSelecionandoTodas(true);
    try {
      const ids = await listarIdsContraNotas(filtros, token);
      if (requestId !== selecaoRequestRef.current) return;
      setSelectedIds(new Set(ids));
    } catch (error: any) {
      if (requestId !== selecaoRequestRef.current) return;
      Alert.alert('Erro', error?.message ?? 'Não foi possível selecionar todas as notas.');
    } finally {
      if (requestId === selecaoRequestRef.current) setIsSelecionandoTodas(false);
    }
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
    if (!token || selectedIds.size === 0) return;

    setIsGeneratingPdf(true);
    try {
      const job = await gerarPdfContraNotas(Array.from(selectedIds), token);
      const final = await aguardarPdfPronto(job, (jobId) =>
        consultarJobPdfContraNotas(jobId, token)
      );
      await abrirPdfGerado(final);
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Não foi possível gerar o PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
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
        <DateRangeField value={periodo} onChange={handlePeriodoChange} />
      </View>

      {!isLoading && !errorMessage && (
        <View style={style.contadorRowRel}>
          <Text style={style.contadorRel}>
            {paginacao.totalNotas === 1
              ? '1 nota encontrada'
              : `${paginacao.totalNotas} notas encontradas`}
          </Text>
          {paginacao.totalNotas > 0 && (
            <Pressable
              style={style.selecionarTodasRel}
              onPress={handleSelecionarTodas}
              disabled={isSelecionandoTodas}
            >
              {isSelecionandoTodas ? (
                <ActivityIndicator size="small" color={themes.colors.verdeMedio} />
              ) : (
                <Text style={style.selecionarTodasTextRel}>
                  {todasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        style={style.listaCN}
        contentContainerStyle={style.contentCN}
        data={isLoading || errorMessage ? [] : contraNotas}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[themes.colors.verdeMedio]}
          />
        }
        onEndReached={handleFimDaLista}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View style={style.centeredCN}>
              <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
            </View>
          ) : errorMessage ? (
            <View style={style.errorBoxCN}>
              <Text style={style.errorTextCN}>{errorMessage}</Text>
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
          isLoadingMais ? (
            <View style={style.footerListaCN}>
              <ActivityIndicator color={themes.colors.verdeMedio} />
            </View>
          ) : erroMais ? (
            <Pressable style={style.footerListaCN} onPress={carregarProximaPagina}>
              <Text style={style.retryTextCN}>
                Não foi possível carregar mais contra-notas. Toque para tentar de novo.
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          return (
            // Tocar no card marca/desmarca a nota; o "Baixar PDF" continua abrindo só ela
            <Pressable
              style={[style.cardCN, isSelected && style.cardSelectedCN]}
              onPress={() => toggleSelecao(item.id)}
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
            (selectedIds.size === 0 || isGeneratingPdf) && style.pdfButtonDisabledRel,
          ]}
          disabled={selectedIds.size === 0 || isGeneratingPdf}
          onPress={handleGerarPdf}
        >
          {isGeneratingPdf ? (
            <ActivityIndicator color={themes.colors.preto} size="small" />
          ) : (
            <Text style={style.pdfButtonTextRel}>
              Baixar PDF das notas selecionadas
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
