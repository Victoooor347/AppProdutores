import React, {
  useEffect, //gerenciar efeitos colaterais
  useMemo, //memorização de valores calculados
  useRef, //guardar valores entre renderizações sem causar nova renderização
  useState //gerenciar estados locais
} from 'react';
import {
  View, //container principal
  Text, //exibir texto
  ActivityIndicator, //indicador de carregamento
  RefreshControl, //controle de atualização, puxar para atualizar
  Alert, //exibir alertas
  Pressable,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; //ícones do Ionicons
import { useAuth } from '../context/authContext'; //hook personalizado para autenticação
import {
  getResumoCargas,
  listCargas,
  listarIdsCargas,
  gerarPdfCargas,
  consultarJobPdf, //funções de serviço para cargas
} from '../services/cargasService';
import { Carga, CargasFiltros, Cultura, ResumoCargas } from '../types/cargas'; //tipos de dados para cargas
import { formatDate } from '../utils/format';
import { ANO_ATUAL, ANO_OPTIONS, Periodo } from '../utils/filtros'; // opções do filtro de ano e tipo do período
import { abrirPdfGerado, aguardarPdfPronto } from '../utils/pdfJob'; // espera o PDF ficar pronto e abre
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader'; // componente de cabeçalho do aplicativo
import SelectField from '../components/SelectField'; //componente de campo de seleção
import DateRangeField from '../components/DateRangeField'; //componente de campo de intervalo de datas
import { style } from '../global/styles';

// Opções de cultura para o filtro
const CULTURA_OPTIONS = [
  { label: 'Todas', value: 'todas' as const },
  { label: 'Arroz', value: 'arroz' as const },
  { label: 'Soja', value: 'soja' as const },
];

// Quantas cargas buscar por vez. As próximas páginas são carregadas quando o
// usuário rola até o fim da lista.
const CARGAS_POR_PAGINA = 30;

export default function Relatorios() {
  // Hook de autenticação para obter o token do usuário
  const { token } = useAuth();

  // Estados para filtros
  const [ano, setAno] = useState(String(ANO_ATUAL));
  const [cultura, setCultura] = useState<Cultura | 'todas'>('todas');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('todas');
  const [periodo, setPeriodo] = useState<Periodo>({});

  // Resumo do ano (cards de total + opções do filtro de IE), junto com o ano a que ele
  // se refere. "dados: null" = a busca falhou.
  const [resumo, setResumo] = useState<{ ano: string; dados: ResumoCargas | null } | null>(null);

  // Lista de cargas, carregada de página em página. Depende de todos os filtros.
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [paginacao, setPaginacao] = useState({ pagina: 1, totalPaginas: 1, totalCargas: 0 });
  // Filtros da última página 1 que chegou da API (ver isLoadingLista abaixo)
  const [filtrosCarregados, setFiltrosCarregados] = useState<CargasFiltros | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [isLoadingMais, setIsLoadingMais] = useState(false);
  const [erroMais, setErroMais] = useState(false);

  // Pull-to-refresh: incrementar o contador faz o resumo e a lista buscarem de novo
  const [recarregamentos, setRecarregamentos] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados para seleção de cargas e geração do PDF
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecionandoTodas, setIsSelecionandoTodas] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Contador de buscas da lista: cada busca nova incrementa o contador, e a resposta só
  // é usada se ainda for a mais recente. Assim, se o usuário troca de filtro rápido, uma
  // resposta atrasada do filtro anterior não sobrescreve o resultado do filtro atual.
  const listaRequestRef = useRef(0);
  // Mesma ideia para o "Selecionar todas": trocar de filtro no meio descarta o resultado
  const selecaoRequestRef = useRef(0);

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

  // "Está carregando" é calculado, não guardado: enquanto o resultado que temos for de
  // outro ano/filtro, mostra o carregamento no lugar dele.
  const isLoadingResumo = resumo?.ano !== ano;
  const isLoadingLista = filtrosCarregados !== filtros;

  // Memoriza as opções de IE para o filtro, incluindo a opção "todas"
  const inscricoesDoAno = resumo?.dados?.inscricoesEstaduais;
  const ieOptions = useMemo(
    () => [
      { label: 'IE', value: 'todas' },
      ...(inscricoesDoAno ?? []).map((ie) => ({ label: ie, value: ie })),
    ],
    [inscricoesDoAno]
  );

  // Busca o resumo do ano quando o ano muda (ou no pull-to-refresh)
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
  }, [token, ano, recarregamentos]);

  // Busca a página 1 da lista sempre que algum filtro muda (ou no pull-to-refresh)
  useEffect(() => {
    if (!token) return;
    const requestId = ++listaRequestRef.current;

    listCargas({ ...filtros, page: 1 }, token)
      .then((response) => {
        if (requestId !== listaRequestRef.current) return;
        setCargas(response.data);
        setPaginacao({
          pagina: response.pagination.page,
          totalPaginas: response.pagination.totalPages,
          totalCargas: response.pagination.totalItems,
        });
        setErroLista(null);
      })
      .catch((error) => {
        if (requestId !== listaRequestRef.current) return;
        setErroLista(error?.message ?? 'Não foi possível carregar as cargas.');
      })
      .finally(() => {
        if (requestId !== listaRequestRef.current) return;
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
    const requestId = ++listaRequestRef.current;
    setIsLoadingMais(true);
    setErroMais(false);

    try {
      const response = await listCargas({ ...filtros, page: paginacao.pagina + 1 }, token);
      if (requestId !== listaRequestRef.current) return;

      setCargas((anteriores) => {
        // Evita repetir uma carga que apareça em duas páginas (ex: carga nova
        // cadastrada enquanto o usuário rolava a lista).
        const idsCarregados = new Set(anteriores.map((carga) => carga.id));
        return [...anteriores, ...response.data.filter((carga) => !idsCarregados.has(carga.id))];
      });
      setPaginacao({
        pagina: response.pagination.page,
        totalPaginas: response.pagination.totalPages,
        totalCargas: response.pagination.totalItems,
      });
    } catch {
      if (requestId !== listaRequestRef.current) return;
      setErroMais(true);
    } finally {
      if (requestId === listaRequestRef.current) setIsLoadingMais(false);
    }
  }

  // Chamada pela lista quando o usuário chega perto do fim: busca a próxima página, se houver
  function handleFimDaLista() {
    if (isLoadingLista || isRefreshing || isLoadingMais || erroMais || erroLista) return;
    if (paginacao.pagina >= paginacao.totalPaginas) return;
    carregarProximaPagina();
  }

  // Função para lidar com a atualização manual dos dados (pull-to-refresh)
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

  // Trocar qualquer filtro limpa a seleção: as cargas marcadas podem não fazer parte do novo resultado.
  function handleAnoChange(novoAno: string) {
    setAno(novoAno);
    // As IEs disponíveis e as datas dependem do ano, então esses filtros também voltam ao padrão.
    setInscricaoEstadual('todas');
    setPeriodo({});
    limparSelecao();
  }

  function handleInscricaoChange(novaInscricao: string) {
    setInscricaoEstadual(novaInscricao);
    limparSelecao();
  }

  function handleCulturaChange(novaCultura: Cultura | 'todas') {
    setCultura(novaCultura);
    limparSelecao();
  }

  function handlePeriodoChange(novoPeriodo: Periodo) {
    setPeriodo(novoPeriodo);
    limparSelecao();
  }

  // Todas as cargas do filtro já estão marcadas? (a seleção é limpa ao trocar de filtro)
  const todasSelecionadas =
    paginacao.totalCargas > 0 && selectedIds.size >= paginacao.totalCargas;

  // "Selecionar todas" marca TODAS as cargas do filtro, inclusive as que ainda não
  // apareceram na rolagem. Se já estão todas marcadas, o botão desmarca.
  async function handleSelecionarTodas() {
    if (!token) return;
    if (todasSelecionadas) {
      limparSelecao();
      return;
    }

    // Se a lista já carregou tudo, não precisa ir na API
    if (cargas.length >= paginacao.totalCargas) {
      setSelectedIds(new Set(cargas.map((carga) => carga.id)));
      return;
    }

    const requestId = ++selecaoRequestRef.current;
    setIsSelecionandoTodas(true);
    try {
      const ids = await listarIdsCargas(filtros, token);
      if (requestId !== selecaoRequestRef.current) return;
      setSelectedIds(new Set(ids));
    } catch (error: any) {
      if (requestId !== selecaoRequestRef.current) return;
      Alert.alert('Erro', error?.message ?? 'Não foi possível selecionar todas as cargas.');
    } finally {
      if (requestId === selecaoRequestRef.current) setIsSelecionandoTodas(false);
    }
  }

  // Função para alternar a seleção de uma carga pelo seu ID
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

  // Função para gerar o PDF das cargas selecionadas
  async function handleGerarPdf() {
    if (!token || selectedIds.size === 0) return;

    setIsGeneratingPdf(true);
    try {
      const job = await gerarPdfCargas(Array.from(selectedIds), token);
      const final = await aguardarPdfPronto(job, (jobId) => consultarJobPdf(jobId, token));
      await abrirPdfGerado(final);
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Não foi possível gerar o PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
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
      <SelectField
        label="Ano"
        value={ano}
        options={ANO_OPTIONS}
        onChange={handleAnoChange}
      />
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
        onChange={handleInscricaoChange}
      />
      <SelectField
        label="Cultura"
        value={cultura}
        options={CULTURA_OPTIONS}
        onChange={handleCulturaChange}
      />
      <DateRangeField value={periodo} onChange={handlePeriodoChange} />
    </View>

    {!isLoadingLista && !erroLista && (
      <View style={style.contadorRowRel}>
        <Text style={style.contadorRel}>
          {paginacao.totalCargas === 1
            ? '1 carga encontrada'
            : `${paginacao.totalCargas} cargas encontradas`}
        </Text>
        {paginacao.totalCargas > 0 && (
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

    {/* Só a lista de cargas rola, com pull-to-refresh e rolagem infinita */}
    <FlatList
      style={style.listaCargasRel}
      contentContainerStyle={style.contentRel}
      data={isLoadingLista || erroLista ? [] : cargas}
      keyExtractor={(carga) => String(carga.id)}
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
        isLoadingLista ? (
          <View style={style.centeredRel}>
            <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
          </View>
        ) : erroLista ? (
          <View style={style.errorBoxRel}>
            <Text style={style.errorTextRel}>{erroLista}</Text>
            <Text style={style.errorHintRel}>Puxe a lista para baixo para tentar de novo.</Text>
          </View>
        ) : (
          <View style={style.emptyBoxRel}>
            <Text style={style.emptyTextRel}>Nenhuma carga encontrada para esse filtro.</Text>
          </View>
        )
      }
      ListFooterComponent={
        isLoadingMais ? (
          <View style={style.footerListaRel}>
            <ActivityIndicator color={themes.colors.verdeMedio} />
          </View>
        ) : erroMais ? (
          <Pressable style={style.footerListaRel} onPress={carregarProximaPagina}>
            <Text style={style.retryTextRel}>
              Não foi possível carregar mais cargas. Toque para tentar de novo.
            </Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item: carga }) => {
        const isSelected = selectedIds.has(carga.id);
        return (
          <Pressable
            style={style.cargaRowRel}
            onPress={() => toggleSelecao(carga.id)}
          >
            <View style={[style.checkboxRel, isSelected && style.checkboxSelectedRel]}>
              {isSelected && <Ionicons name="checkmark" size={14} color={themes.colors.branco} />}
            </View>
            <Text style={[style.cargaCellRel, style.cargaCellDataRel]}>{formatDate(carga.data)}</Text>
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
          (selectedIds.size === 0 || isGeneratingPdf) && style.pdfButtonDisabledRel,
        ]}
        disabled={selectedIds.size === 0 || isGeneratingPdf}
        onPress={handleGerarPdf}
      >
        {isGeneratingPdf ? (
          <ActivityIndicator color={themes.colors.preto} size="small" />
        ) : (
          <Text style={style.pdfButtonTextRel}>
            Gerar PDF das cargas selecionadas
            {selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Text>
        )}
      </Pressable>
    </View>
  </View>
)}

