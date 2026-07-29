import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useAuth } from '../context/authContext';
import { listContraNotas } from '../services/contranotasService';
import { ContraNota } from '../types/contranotas';
import { formatDate } from '../utils/format';
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader';
import { style } from '../global/styles';

export default function ContraNotas() {
  const { token } = useAuth();

  const [contraNotas, setContraNotas] = useState<ContraNota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadContraNotas();
      setIsLoading(false);
    })();
  }, [loadContraNotas]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadContraNotas();
    setIsRefreshing(false);
  }

  async function handleBaixarPdf(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o PDF.');
    }
  }

  return (
    <View style={style.screenCN}>
      <AppHeader title="App Produtor" />

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