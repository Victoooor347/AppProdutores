import React, { 
  useCallback, //otimização de funções
  useEffect, //gerenciar efeitos colaterais
  useMemo, //memorização de valores calculados
  useState //gerenciar estados locais
} from 'react';
import {
  View, //container principal
  Text, //exibir texto
  TouchableOpacity, //botão clicável
  ActivityIndicator, //indicador de carregamento
  RefreshControl, //controle de atualização, puxar para atualizar
  ScrollView, //container rolável
  Alert, //exibir alertas
  Linking, //abrir links externos
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; //ícones do Ionicons
import { useAuth } from '../context/authContext'; //hook personalizado para autenticação
import {
  getResumoCargas, 
  listCargas, 
  gerarPdfCargas, 
  consultarJobPdf, //funções de serviço para cargas
} from '../services/cargasService';
import { Carga, Cultura, ResumoCultura } from '../types/cargas'; //tipos de dados para cargas
import { formatDate } from '../utils/format'; 
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader'; // componente de cabeçalho do aplicativo
import SelectField from '../components/SelectField'; //componente de campo de seleção
import DateRangeField from '../components/DateRangeField'; //componente de campo de intervalo de datas
import { style } from '../global/styles';

// Constantes para o ano atual e opções de anos
const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => String(ANO_ATUAL - i));

// Opções de cultura para o filtro
const CULTURA_OPTIONS = [
  { label: 'Todas', value: 'todas' as const },
  { label: 'Arroz', value: 'arroz' as const },
  { label: 'Soja', value: 'soja' as const },
];

// Constantes para controle de polling ao gerar PDF
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_TENTATIVAS = 20; // ~30s no total antes de desistir

export default function Relatorios() {
  // Hook de autenticação para obter o token do usuário
  const { token } = useAuth();

  // Estados para filtros e dados
  const [ano, setAno] = useState(String(ANO_ATUAL));
  const [cultura, setCultura] = useState<Cultura | 'todas'>('todas');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('todas');
  const [periodo, setPeriodo] = useState<{ dataInicio?: string; dataFim?: string }>({});

  // Estados para armazenar os dados carregados
  const [resumo, setResumo] = useState<ResumoCultura[]>([]);
  const [cargas, setCargas] = useState<Carga[]>([]);

  // Usado só pra montar as opções do filtro de IE — carregado sem os
  // outros filtros aplicados, pra sempre mostrar todas as IEs do ano.
  const [catalogoIEs, setCatalogoIEs] = useState<string[]>([]);

  // Estados para gerenciar seleção, carregamento e erros
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Memoriza as opções de IE para o filtro, incluindo a opção "todas"
  const ieOptions = useMemo(
    () => [
      { label: 'IE', value: 'todas' },
      ...catalogoIEs.map((ie) => ({ label: ie, value: ie })),
    ],
    [catalogoIEs]
  );

  // Função para carregar os dados do relatório, usando useCallback para evitar recriações desnecessárias
  const loadDados = useCallback(async () => {
    if (!token) return;
    try {
      setErrorMessage(null);

      // Faz as chamadas de API em paralelo para otimizar o tempo de carregamento
      const [resumoData, catalogoData, cargasData] = await Promise.all([
        getResumoCargas(Number(ano), token),
        listCargas({ ano: Number(ano), perPage: 100 }, token), 
        listCargas(
          {
            ano: Number(ano),
            cultura: cultura === 'todas' ? undefined : cultura,
            inscricaoEstadual: inscricaoEstadual === 'todas' ? undefined : inscricaoEstadual,
            dataInicio: periodo.dataInicio,
            dataFim: periodo.dataFim,
            perPage: 100,
          },
          token
        ),
      ]);

      // Atualiza o estado com os dados carregados
      setResumo(resumoData);
      // Atualiza o catálogo de IEs com base nos dados carregados, removendo duplicatas e valores nulos
      setCatalogoIEs(
        Array.from(
          new Set(
            catalogoData.data
              .map((carga) => carga.inscricaoEstadual)
              .filter((ie): ie is string => Boolean(ie))
          )
        )
      );
      // Atualiza a lista de cargas com base nos dados carregados
      setCargas(cargasData.data);
      // Remove da seleção qualquer carga que não esteja mais na lista
      // filtrada (ex: usuário selecionou e depois mudou o filtro).
      setSelectedIds((prev) => {
        const idsVisiveis = new Set(cargasData.data.map((carga) => carga.id));
        return new Set(Array.from(prev).filter((id) => idsVisiveis.has(id)));
      });
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Não foi possível carregar os relatórios.');
    }
  }, [token, ano, cultura, inscricaoEstadual, periodo]);

  // useEffect para carregar os dados quando o componente é montado ou quando os filtros mudam
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadDados();
      setIsLoading(false);
    })();
  }, [loadDados]);

  // Função para lidar com a atualização manual dos dados (pull-to-refresh)
  async function handleRefresh() {
    setIsRefreshing(true);
    await loadDados();
    setIsRefreshing(false);
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
      let job = await gerarPdfCargas(Array.from(selectedIds), token);

      let tentativas = 0;
      while (job.status === 'processando' && tentativas < POLL_MAX_TENTATIVAS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        job = await consultarJobPdf(job.jobId, token);
        tentativas += 1;
      }

      if (job.status === 'pronto' && job.arquivoPdfUrl) {
        await Linking.openURL(job.arquivoPdfUrl);
      } else if (job.status === 'erro') {
        Alert.alert('Erro', 'Não foi possível gerar o PDF. Tente novamente.');
      } else {
        Alert.alert(
          'Ainda processando',
          'A geração do PDF está demorando mais que o esperado. Tente novamente em instantes.'
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Não foi possível gerar o PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  // Função para obter o resumo de uma cultura específica
  function resumoDoCultura(valorCultura: Cultura) {
    return resumo.find((item) => item.cultura === valorCultura);
  }

  return (
    <View style={style.screenRel}>
      <AppHeader title="App Produtor" />

      <ScrollView
        contentContainerStyle={style.contentRel}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[themes.colors.verdeMedio]}
          />
        }
      >
        <View style={style.titleRowRel}>
          <Text style={style.titleRel}>Relatório de Safra</Text>
          <SelectField
            label="Ano"
            value={ano}
            options={ANOS.map((a) => ({ label: a, value: a }))}
            onChange={setAno}
          />
        </View>

        {isLoading ? (
          <View style={style.centeredRel}>
            <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
          </View>
        ) : errorMessage ? (
          <View style={style.errorBoxRel}>
            <Text style={style.errorTextRel}>{errorMessage}</Text>
          </View>
        ) : (
          <>
            <View style={style.resumoRowRel}>
              <View style={style.resumoCardRel}>
                <Text style={style.resumoLabelRel}>Total entregue - Arroz</Text>
                <Text style={style.resumoValueRel}>
                  {resumoDoCultura('arroz')?.totalSacas ?? 0}{' '}
                  <Text style={style.resumoUnidadeRel}>
                    {resumoDoCultura('arroz')?.unidade ?? 'sc'}
                  </Text>
                </Text>
              </View>
              <View style={style.resumoCardRel}>
                <Text style={style.resumoLabelRel}>Total entregue - Soja</Text>
                <Text style={style.resumoValueRel}>
                  {resumoDoCultura('soja')?.totalSacas ?? 0}{' '}
                  <Text style={style.resumoUnidadeRel}>
                    {resumoDoCultura('soja')?.unidade ?? 'sc'}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={style.filterBarRel}>
              <SelectField
                label="IE"
                value={inscricaoEstadual}
                options={ieOptions}
                onChange={setInscricaoEstadual}
              />
              <SelectField label="Cultura" value={cultura} options={CULTURA_OPTIONS} onChange={setCultura} />
              <DateRangeField value={periodo} onChange={setPeriodo} />
            </View>
          </>
        )}

        {!isLoading && !errorMessage && cargas.length === 0 && (
          <View style={style.emptyBoxRel}>
            <Text style={style.emptyTextRel}>Nenhuma carga encontrada para esse filtro.</Text>
          </View>
        )}

        {!isLoading &&
          !errorMessage &&
          cargas.map((carga) => {
            const isSelected = selectedIds.has(carga.id);
            return (
              <TouchableOpacity
                key={carga.id}
                style={style.cargaRowRel}
                onPress={() => toggleSelecao(carga.id)} 
                activeOpacity={0.7}
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
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      <View style={style.footerRel}>
        <TouchableOpacity
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
        </TouchableOpacity>
      </View>
    </View>
  );
}
