import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  ImageBackground,
  Image,
} from 'react-native';
import { useAuth } from '../context/authContext';
import { getPrecosDoDia } from '../services/precosService';
import { PrecoDia } from '../types/precos';
import { formatCurrency, formatDateTime } from '../utils/format';
import { themes } from '../global/themes';
import { style } from '../global/styles';
import AppHeader from '../components/AppHeader';
import cotacoes from '../assets/cotacoes.png';
import logo from '../assets/logo.png';

export default function Dashboard() {
  // Importa o token de autenticação do contexto de autenticação para autorizar as requisições à API
  const { token } = useAuth();

  // Estado local para armazenar a lista de preços do dia, o estado de carregamento, o estado de atualização e a mensagem de erro
  const [precos, setPrecos] = useState<PrecoDia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Função assíncrona para carregar os preços do dia da API, utilizando o token de autenticação e atualizando os estados de erro e de lista de preços
  const loadPrecos = useCallback(async () => {
    if (!token) return;
    try {
      setErrorMessage(null);
      const data = await getPrecosDoDia(token);
      setPrecos(data);
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Não foi possível carregar os preços do dia.');
    }
  }, [token]);

  // useEffect para carregar os preços assim que a tela monta, chamando a função loadPrecos e atualizando o estado de carregamento
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadPrecos();
      setIsLoading(false);
    })();
  }, [loadPrecos]);

  // Função assíncrona para lidar com a atualização da lista de preços, chamando a função loadPrecos e atualizando o estado de atualização
  async function handleRefresh() {
    setIsRefreshing(true);
    await loadPrecos();
    setIsRefreshing(false);
  }

  // Calcula a última atualização dos preços do dia, comparando as datas de atualização de cada item e retornando a mais recente
  const ultimaAtualizacao = precos.reduce<string | null>((latest, item) => {
    if (!latest) return item.atualizadoEm;
    return item.atualizadoEm > latest ? item.atualizadoEm : latest;
  }, null);

  return (
    <View style={style.screenDB}>
      <AppHeader title="Dickow Produtores" />

      <ScrollView
        contentContainerStyle={style.contentDB}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[themes.colors.verdeMedio]}
          />
        }
      >
        {isLoading ? (
          <View style={style.centeredDB}>
            <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
          </View>
        ) : errorMessage ? (
          <View style={style.errorBoxDB}>
            <Text style={style.errorTextDB}>{errorMessage}</Text>
          </View>
        ) : (
          <View style={style.cardDB}>
            <ImageBackground
              source={cotacoes}
              style={style.heroImageDB}
              imageStyle={style.heroImageRadiusDB}
            >
              <View style={style.badgeDB}>
                <Text style={style.badgeTextDB}>Cotações</Text>
              </View>
            </ImageBackground>

            <View style={style.pricesPanelDB}>
              {precos.map((item, index) => (
                <View key={item.commodity}>
                  {index > 0 && <View style={style.dividerDB} />}
                  <View style={style.priceRowDB}>
                    <Text style={style.commodityNameDB}>{item.nomeExibicao}</Text>
                    <Text style={style.commodityPriceDB}>{formatCurrency(item.preco)}*</Text>
                    {/* !! evita quebrar a tela se a API mandar descricao vazia ("") */}
                    {!!item.descricao && (
                      <Text style={style.commodityDescriptionDB}>{item.descricao}**</Text>
                    )}
                  </View>
                </View>
              ))}

              {precos.length === 0 && (
                <Text style={style.emptyTextDB}>Nenhum preço disponível no momento.</Text>
              )}

              {ultimaAtualizacao && (
                <Text style={style.updatedAtDB}>
                  Última atualização: {formatDateTime(ultimaAtualizacao)}
                </Text>
              )}
              <Text style={style.footnoteDB}>*Preço bruto</Text>
              <Text style={style.footnoteDB}>**Consultar para demais produções</Text>

              <View style={style.dividerDB} />

              <Image source={logo} style={style.footerLogoDB} resizeMode="contain" />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
