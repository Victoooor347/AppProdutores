import React, { useCallback, useEffect, useState } from 'react'; // Importa o React e os hooks useCallback, useEffect e useState para gerenciar o estado e os efeitos colaterais do componente
import {
  View,
  Text,
  TextInput, // Componente que permite criar campos de entrada de texto
  TouchableOpacity, // Componente que permite criar botões e áreas clicáveis
  ActivityIndicator, // Componente que exibe um indicador de carregamento (spinner)
  ScrollView, // Componente que permite criar uma área rolável para exibir conteúdo maior que a tela
  Alert, // Componente para exibir alertas e mensagens de erro
} from 'react-native';
import { useAuth } from '../context/authContext'; // Importa o hook useAuth do contexto de autenticação para acessar informações do usuário e funções relacionadas à autenticação
import { getProfile, updateProfile } from '../services/userService'; // Importa as funções getProfile e updateProfile do serviço de usuário para buscar e atualizar o perfil do usuário
import { UserProfile } from '../types/userprofile'; // Importa o tipo UserProfile que define a estrutura do perfil do usuário
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader'; // Importa o componente AppHeader que exibe o cabeçalho da aplicação
import { style } from '../global/styles';

export default function User() {
  // Contexto de autenticação
  const { token, signOut } = useAuth();

  // Estado do componente
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [telefone, setTelefone] = useState('');
  const [propriedade, setPropriedade] = useState('');

  // Estado de carregamento e salvamento
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Função para carregar o perfil do usuário
  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      setErrorMessage(null);
      const data = await getProfile(token);
      setProfile(data);
      setName(data.name);
      setTelefone(data.telefone);
      setPropriedade(data.propriedade);
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Não foi possível carregar seu perfil.');
    }
  }, [token]);

  // useEffect para carregar o perfil do usuário quando o componente é montado
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadProfile();
      setIsLoading(false);
    })();
  }, [loadProfile]);

  // Verifica se houve alguma mudança nos campos do perfil em relação ao perfil carregado
  const houveMudanca =
    profile !== null &&
    (name !== profile.name || telefone !== profile.telefone || propriedade !== profile.propriedade);

  // Função para salvar as alterações do perfil do usuário
  async function handleSalvar() {
    if (!token || !houveMudanca) return;

    if (!name.trim()) {
      Alert.alert('Atenção', 'O nome não pode ficar vazio.');
      return;
    }

    // Validação do telefone (opcional)
    setIsSaving(true);
    try {
      const atualizado = await updateProfile({ name, telefone, propriedade }, token);
      setProfile(atualizado);
      setName(atualizado.name);
      setTelefone(atualizado.telefone);
      setPropriedade(atualizado.propriedade);
      Alert.alert('Pronto', 'Perfil atualizado com sucesso.');
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  }

  // Função para lidar com o logout do usuário
  function handleSignOut() {
    Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View style={style.screenUser}>
      <AppHeader title="Dickow Produtores" />

      <ScrollView contentContainerStyle={style.contentUser}>
        <Text style={style.titleUser}>Meu Perfil</Text>

        {isLoading ? (
          <View style={style.centeredUser}>
            <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
          </View>
        ) : errorMessage ? (
          <View style={style.errorBoxUser}>
            <Text style={style.errorTextUser}>{errorMessage}</Text>
          </View>
        ) : (
          <>
            <View style={style.fieldUser}>
              <Text style={style.labelUser}>CPF</Text>
              <View style={[style.inputUser, style.inputDisabledUser]}>
                <Text style={style.inputDisabledTextUser}>{profile?.cpf}</Text>
              </View>
              <Text style={style.helperTextUser}>O CPF não pode ser alterado.</Text>
            </View>

            <View style={style.fieldUser}>
              <Text style={style.labelUser}>Nome</Text>
              <TextInput
                style={style.inputUser}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={themes.colors.cinzaMedio}
              />
            </View>

            <View style={style.fieldUser}>
              <Text style={style.labelUser}>Telefone</Text>
              <TextInput
                style={style.inputUser}
                value={telefone}
                onChangeText={setTelefone}
                placeholder="(00) 00000-0000"
                placeholderTextColor={themes.colors.cinzaMedio}
                keyboardType="phone-pad"
              />
            </View>

            <View style={style.fieldUser}>
              <Text style={style.labelUser}>Propriedade</Text>
              <TextInput
                style={style.inputUser}
                value={propriedade}
                onChangeText={setPropriedade}
                placeholder="Nome da fazenda/propriedade"
                placeholderTextColor={themes.colors.cinzaMedio}
              />
            </View>

            <TouchableOpacity
              style={[style.saveButtonUser, (!houveMudanca || isSaving) && style.saveButtonDisabledUser]}
              disabled={!houveMudanca || isSaving}
              onPress={handleSalvar}
            >
              {isSaving ? (
                <ActivityIndicator color={themes.colors.branco} size="small" />
              ) : (
                <Text style={style.saveButtonTextUser}>Salvar alterações</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={style.signOutButtonUser} onPress={handleSignOut}>
          <Text style={style.signOutButtonTextUser}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
