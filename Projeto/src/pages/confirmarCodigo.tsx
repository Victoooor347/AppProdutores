import React, { useEffect, useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  ActivityIndicator, // Indicador de carregamento enquanto confirma
  Alert,
  KeyboardAvoidingView, // Ajusta a tela quando o teclado abre
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/authContext';
import { solicitarCodigo } from '../services/authService';
import {
  CODIGO_LENGTH,
  MIN_PASSWORD_LENGTH,
  isValidCodigo,
  isValidPassword,
} from '../utils/validators';
import { themes } from '../global/themes';
import { style } from '../global/styles';

type Props = StackScreenProps<RootStackParamList, 'ConfirmarCodigo'>;

// Textos que mudam entre "Primeiro acesso" e "Esqueci minha senha"
const TEXTOS = {
  primeiro_acesso: { labelSenha: 'Crie uma senha', botao: 'Criar senha e entrar' },
  recuperar_senha: { labelSenha: 'Nova senha', botao: 'Salvar nova senha e entrar' },
};

// Segunda etapa: digitar o código que chegou por e-mail e escolher a senha.
// Deu certo → o AuthContext salva a sessão e o app troca sozinho para as telas logadas.
export default function ConfirmarCodigo({ route }: Props) {
  const { finalidade, cpf, expiraEmSegundos } = route.params;
  const textos = TEXTOS[finalidade];
  const { signInWithCode } = useAuth();

  const [emailMascarado, setEmailMascarado] = useState(route.params.emailMascarado);
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReenviando, setIsReenviando] = useState(false);

  // Contagem regressiva para liberar o "Reenviar código" (a API só aceita um pedido por minuto)
  const [segundosParaReenviar, setSegundosParaReenviar] = useState(route.params.reenviarEmSegundos);
  useEffect(() => {
    if (segundosParaReenviar <= 0) return;
    const timer = setTimeout(() => setSegundosParaReenviar((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [segundosParaReenviar]);

  // Confere os campos antes de chamar a API
  function validateForm(): string | null {
    if (!isValidCodigo(codigo)) {
      return `Digite o código de ${CODIGO_LENGTH} números que chegou no seu e-mail.`;
    }
    if (!isValidPassword(senha)) {
      return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (senha !== confirmacaoSenha) {
      return 'As duas senhas digitadas não são iguais.';
    }
    return null;
  }

  async function handleConfirmar() {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Atenção', validationError);
      return;
    }

    setIsSaving(true);
    try {
      await signInWithCode(finalidade, cpf, codigo, senha);
    } catch (error: any) {
      Alert.alert('Não foi possível confirmar', error?.message ?? 'Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  // Pede outro código (o anterior deixa de valer)
  async function handleReenviar() {
    setIsReenviando(true);
    try {
      const enviado = await solicitarCodigo(finalidade, cpf);
      setEmailMascarado(enviado.emailMascarado);
      setSegundosParaReenviar(enviado.reenviarEmSegundos);
      setCodigo('');
      Alert.alert(
        'Código reenviado',
        `Enviamos um novo código para ${enviado.emailMascarado}. O código anterior não vale mais.`
      );
    } catch (error: any) {
      Alert.alert('Não foi possível reenviar', error?.message ?? 'Tente novamente.');
    } finally {
      setIsReenviando(false);
    }
  }

  const podeReenviar = segundosParaReenviar <= 0 && !isReenviando;
  const textoReenviar = isReenviando
    ? 'Reenviando...'
    : segundosParaReenviar > 0
      ? `Reenviar código em ${segundosParaReenviar}s`
      : 'Não recebeu? Reenviar código';

  return (
    <KeyboardAvoidingView
      style={style.screenAuth}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Ícones da barra de status em branco, sobre o cabeçalho verde */}
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={style.contentAuth} keyboardShouldPersistTaps="handled">
        <Text style={style.titleAuth}>Digite o código</Text>
        <Text style={style.textAuth}>
          Enviamos um código de {CODIGO_LENGTH} números para{' '}
          <Text style={style.destaqueAuth}>{emailMascarado}</Text>. Ele vale por{' '}
          {Math.round(expiraEmSegundos / 60)} minutos. Se não encontrar, olhe também a caixa de
          spam.
        </Text>

        <Text style={style.labelAuth}>Código</Text>
        <TextInput
          style={[style.inputAuth, style.inputCodigoAuth]}
          value={codigo}
          onChangeText={(texto) => setCodigo(texto.replace(/\D/g, '').slice(0, CODIGO_LENGTH))}
          placeholder="000000"
          placeholderTextColor={themes.colors.cinzaMedio}
          keyboardType="number-pad"
          maxLength={CODIGO_LENGTH}
          textContentType="oneTimeCode"
          autoFocus
        />

        <Text style={style.labelAuth}>{textos.labelSenha}</Text>
        <TextInput
          style={style.inputAuth}
          value={senha}
          onChangeText={setSenha}
          placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
          placeholderTextColor={themes.colors.cinzaMedio}
          secureTextEntry
          textContentType="newPassword"
        />

        <Text style={style.labelAuth}>Confirme a senha</Text>
        <TextInput
          style={style.inputAuth}
          value={confirmacaoSenha}
          onChangeText={setConfirmacaoSenha}
          placeholder="Digite a senha de novo"
          placeholderTextColor={themes.colors.cinzaMedio}
          secureTextEntry
          textContentType="newPassword"
        />

        <Pressable
          style={[style.buttonAuth, isSaving && style.buttonDisabledAuth]}
          onPress={handleConfirmar}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={themes.colors.branco} size="small" />
          ) : (
            <Text style={style.buttonTextAuth}>{textos.botao}</Text>
          )}
        </Pressable>

        <Pressable onPress={handleReenviar} disabled={!podeReenviar}>
          <Text style={[style.linkAuth, !podeReenviar && style.linkDisabledAuth]}>
            {textoReenviar}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
