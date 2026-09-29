import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator, // Indicador de carregamento enquanto o código é enviado
  Alert,
  KeyboardAvoidingView, // Ajusta a tela quando o teclado abre
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { solicitarCodigo } from '../services/authService';
import { formatCpf, isValidCpf } from '../utils/validators';
import { themes } from '../global/themes';
import { style } from '../global/styles';

type Props = StackScreenProps<RootStackParamList, 'SolicitarCodigo'>;

// Textos que mudam entre "Primeiro acesso" e "Esqueci minha senha" — o resto da tela é igual
const TEXTOS = {
  primeiro_acesso: {
    titulo: 'Crie sua senha',
    explicacao:
      'Digite seu CPF. Vamos enviar um código de 6 números para o e-mail que a Dickow tem no seu cadastro.',
  },
  recuperar_senha: {
    titulo: 'Recupere sua senha',
    explicacao:
      'Digite seu CPF. Vamos enviar um código de 6 números para o e-mail do seu cadastro, para você criar uma senha nova.',
  },
};

// Primeira etapa do primeiro acesso / recuperação de senha: pedir o código por e-mail.
export default function SolicitarCodigo({ navigation, route }: Props) {
  const { finalidade } = route.params;
  const textos = TEXTOS[finalidade];

  // Já vem preenchido se o produtor tinha digitado o CPF na tela de login
  const [cpf, setCpf] = useState(route.params.cpf ?? '');
  const [isLoading, setIsLoading] = useState(false);

  // Pede o código à API e, se deu certo, vai para a tela de digitar o código
  async function handleEnviar() {
    if (!isValidCpf(cpf)) {
      Alert.alert('Atenção', 'CPF inválido. Verifique os números digitados.');
      return;
    }

    setIsLoading(true);
    try {
      const enviado = await solicitarCodigo(finalidade, cpf);
      navigation.navigate('ConfirmarCodigo', { finalidade, cpf, ...enviado });
    } catch (error: any) {
      Alert.alert('Não foi possível enviar o código', error?.message ?? 'Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={style.screenAuth}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Ícones da barra de status em branco, sobre o cabeçalho verde */}
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={style.contentAuth} keyboardShouldPersistTaps="handled">
        <Text style={style.titleAuth}>{textos.titulo}</Text>
        <Text style={style.textAuth}>{textos.explicacao}</Text>

        <View>
          <Text style={style.labelAuth}>CPF</Text>
          <TextInput
            style={style.inputAuth}
            value={cpf}
            onChangeText={(texto) => setCpf(formatCpf(texto))}
            placeholder="000.000.000-00"
            placeholderTextColor={themes.colors.cinzaMedio}
            keyboardType="numeric"
            maxLength={14}
            autoFocus={!route.params.cpf}
          />
        </View>

        <Pressable
          style={[style.buttonAuth, isLoading && style.buttonDisabledAuth]}
          onPress={handleEnviar}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={themes.colors.branco} size="small" />
          ) : (
            <Text style={style.buttonTextAuth}>Enviar código</Text>
          )}
        </Pressable>

        <Text style={style.footnoteAuth}>
          O e-mail está errado ou você não tem cadastro? Fale com a Dickow.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
