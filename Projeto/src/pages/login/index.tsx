import React, { useState } from 'react'; // Importa o React e o hook useState para gerenciar o estado do componente
import {
  Text,
  View,
  Image,
  TextInput, // Importa componentes do React Native para criar a interface do usuário
  Alert, // Componente para exibir alertas e mensagens de erro
  ActivityIndicator, // Componente que exibe um indicador de carregamento (spinner)
  KeyboardAvoidingView, // Componente que ajusta a interface quando o teclado é exibido
  Platform, // Componente que permite detectar a plataforma (iOS ou Android) em que o aplicativo está sendo executado
  Pressable, // Componente que permite criar áreas clicáveis
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack'; // Tipo das props que o navegador passa para a tela (navigation, route)
import { style } from '../../global/styles';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/authContext'; // Importa o hook useAuth do contexto de autenticação para acessar funções e estados relacionados à autenticação
import { RootStackParamList } from '../../types/navigation';
import { FinalidadeCodigo } from '../../types/auth';
import {
  formatCpf, // Função para formatar o CPF digitado pelo usuário
  isValidCpf, // Função para validar se o CPF digitado é válido
  isValidPassword, // Função para validar se a senha digitada atende aos critérios de segurança
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
