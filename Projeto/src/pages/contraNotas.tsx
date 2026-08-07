
import React, { useCallback, useEffect, useState } from 'react'; // Importa o React e os hooks useCallback, useEffect e useState para gerenciar o estado e os efeitos colaterais do componente
import {
  View,
  Text,
  TouchableOpacity, // Componente que permite criar botões e áreas clicáveis
  ActivityIndicator, // Componente que exibe um indicador de carregamento (spinner)
  RefreshControl, // Componente que permite adicionar funcionalidade de "pull to refresh" em listas
  ScrollView, // Componente que permite criar uma área rolável para exibir conteúdo maior que a tela
  Linking, // Componente que permite abrir URLs externas, como links para PDFs
  Alert, // Componente para exibir alertas e mensagens de erro
} from 'react-native';
import { useAuth } from '../context/authContext'; // Importa o hook useAuth do contexto de autenticação para acessar funções e estados relacionados à autenticação
import { listContraNotas } from '../services/contranotasService'; // Importa a função listContraNotas do serviço de contra-notas para buscar os dados das contra-notas da API
import { ContraNota } from '../types/contranotas'; // Importa o tipo ContraNota para tipar os dados das contra-notas recebidas da API
import { formatDate } from '../utils/format'; // Importa a função formatDate para formatar datas em um formato legível para o usuário
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader'; // Importa o componente AppHeader para exibir o cabeçalho da tela
import { style } from '../global/styles';

export default function ContraNotas() {

  // Importa o token de autenticação do contexto de autenticação para autorizar as requisições à API
  const { token } = useAuth();

  // Estado local para armazenar a lista de contra-notas, o estado de carregamento, o estado de atualização e a mensagem de erro
  const [contraNotas, setContraNotas] = useState<ContraNota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Função assíncrona para carregar as contra-notas da API, utilizando o token de autenticação e atualizando os estados de erro e de lista de contra-notas
  const loadContraNotas = useCallback(async () => {
    if (!token) return;
    try {
      setErrorMessage(null);
      const response = await listContraNotas({ perPage: 50 }, token);
      setContraNotas(response.data);
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Não foi possível carregar as contra-notas.');
    }
  }, [token]);

  // useEffect para carregar as contra-notas quando o componente é montado, chamando a função loadContraNotas e atualizando o estado de carregamento
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadContraNotas();
      setIsLoading(false);
    })();
  }, [loadContraNotas]);

  // Função assíncrona para lidar com a atualização da lista de contra-notas, chamando a função loadContraNotas e atualizando o estado de atualização
  async function handleRefresh() {
    setIsRefreshing(true);
    await loadContraNotas();
    setIsRefreshing(false);
  }

  // Função assíncrona para lidar com o download do PDF da contra-nota, utilizando o Linking para abrir a URL do PDF e exibindo um alerta em caso de erro
  async function handleBaixarPdf(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o PDF.');
    }
  }

  return (
    <View style={style.screenCN}>
      <AppHeader title="Dickow Produtores" />

      <ScrollView
        contentContainerStyle={style.contentCN}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[themes.colors.verdeMedio]}
          />
        }
      >
        <Text style={style.titleCN}>Contra Notas</Text>

        {isLoading ? (
          <View style={style.centeredCN}>
            <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
          </View>
        ) : errorMessage ? (
          <View style={style.errorBoxCN}>
            <Text style={style.errorTextCN}>{errorMessage}</Text>
          </View>
        ) : contraNotas.length === 0 ? (
          <View style={style.emptyBoxCN}>
            <Text style={style.emptyTextCN}>Nenhuma contra-nota disponível.</Text>
          </View>
        ) : (
          contraNotas.map((item) => (
            <View key={item.id} style={style.cardCN}>
              <Text style={style.cardTitleCN}>NF - {item.numero}</Text>
              <Text style={style.cardDateCN}>{formatDate(item.dataEmissao)}</Text>
              <TouchableOpacity
                style={style.downloadButtonCN}
                onPress={() => handleBaixarPdf(item.arquivoPdfUrl)}
              >
                <Text style={style.downloadButtonTextCN}>Baixar PDF</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}