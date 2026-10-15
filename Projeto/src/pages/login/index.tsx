import React, { useState } from 'react';
import {
  Text,
  View,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { style } from '../../global/styles';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/authContext';
import { RootStackParamList } from '../../types/navigation';
import { FinalidadeCodigo } from '../../types/auth';
import {
  formatCpf,
  isValidCpf,
  isValidPassword,
  MIN_PASSWORD_LENGTH, // Constante que define o comprimento mínimo da senha
} from '../../utils/validators';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

export default function Login({ navigation }: Props) {
  // Importa a função signIn do contexto de autenticação para realizar o login do usuário
  const { signIn } = useAuth();

  // Estado local para armazenar o CPF, a senha e o estado de carregamento do login
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Função para lidar com a mudança no campo de CPF, aplicando a máscara 000.000.000-00 enquanto o usuário digita
  function handleCpfChange(text: string) {
    setCpf(formatCpf(text));
  }

  // Função para validar o formulário de login, verificando se os campos estão preenchidos e se os valores são válidos
  function validateForm(): string | null {
    if (!cpf || !password) {
      return 'Por favor, preencha todos os campos.';
    }
    if (!isValidCpf(cpf)) {
      return 'CPF inválido. Verifique os números digitados.';
    }
    if (!isValidPassword(password)) {
      return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    return null;
  }

  // Função assíncrona para lidar com o processo de login, validando o formulário e chamando a função signIn do contexto de autenticação
  async function handleLogin() {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Atenção', validationError);
      return;
    }

    setIsLoading(true);
    try {
      await signIn(cpf, password);
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Não foi possível fazer login.');
    } finally {
      setIsLoading(false);
    }
  }

  // Abre o primeiro acesso ou a recuperação de senha, levando o CPF já digitado (se tiver)
  function irParaCodigo(finalidade: FinalidadeCodigo) {
    navigation.navigate('SolicitarCodigo', { finalidade, cpf: cpf || undefined });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={style.container}
    >
      <View style={style.boxTop}>
        <Image source={logo} style={style.logo} resizeMode="contain" />
        <Text style={style.text}>Acesso exclusivo para produtores!</Text>
      </View>
      <View style={style.boxMid}>
        <Text style={style.titleinput}>CPF</Text>
        <TextInput
          style={style.placeholder}
          placeholder="Digite seu CPF"
          value={cpf}
          onChangeText={handleCpfChange}
          keyboardType="numeric"
          maxLength={14}
          placeholderTextColor={style.placeholder.color}
        />
        <Text style={style.titleinput}>Senha</Text>
        <TextInput
          style={style.placeholder}
          placeholder="Digite sua senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={style.placeholder.color}
        />
      </View>
      <View style={style.boxBottom}>
        {/* Desabilitado enquanto carrega, pra dois toques rápidos não enviarem o login duas vezes */}
        <Pressable style={style.button} onPress={() => handleLogin()} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size={'small'} />
          ) : (
            <Text style={style.textbutton}>Entrar</Text>
          )}
        </Pressable>
        <Pressable onPress={() => irParaCodigo('recuperar_senha')}>
          <Text style={style.linkLogin}>Esqueci minha senha</Text>
        </Pressable>
        <Pressable onPress={() => irParaCodigo('primeiro_acesso')}>
          <Text style={style.linkLogin}>Primeiro acesso? Crie sua senha</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
