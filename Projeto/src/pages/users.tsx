import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../context/authContext';
import { getProfile, updateProfile } from '../services/userService';
import { UserProfile } from '../types/userprofile';
import { themes } from '../global/themes';
import AppHeader from '../components/AppHeader';

export default function User() {
  const { token, signOut } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [telefone, setTelefone] = useState('');
  const [propriedade, setPropriedade] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadProfile();
      setIsLoading(false);
    })();
  }, [loadProfile]);

  // Só habilita "Salvar" se algo realmente mudou — evita uma chamada de API
  // desnecessária quando o usuário só entrou pra olhar a tela.
  const houveMudanca =
    profile !== null &&
    (name !== profile.name || telefone !== profile.telefone || propriedade !== profile.propriedade);

  async function handleSalvar() {
    if (!token || !houveMudanca) return;

    if (!name.trim()) {
      Alert.alert('Atenção', 'O nome não pode ficar vazio.');
      return;
    }

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

  function handleSignOut() {
    Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Dickow Produtores" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meu Perfil</Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={themes.colors.verdeMedio} />
          </View>
        ) : errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>CPF</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.inputDisabledText}>{profile?.cpf}</Text>
              </View>
              <Text style={styles.helperText}>O CPF não pode ser alterado.</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={themes.colors.cinzaMedio}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                value={telefone}
                onChangeText={setTelefone}
                placeholder="(00) 00000-0000"
                placeholderTextColor={themes.colors.cinzaMedio}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Propriedade</Text>
              <TextInput
                style={styles.input}
                value={propriedade}
                onChangeText={setPropriedade}
                placeholder="Nome da fazenda/propriedade"
                placeholderTextColor={themes.colors.cinzaMedio}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!houveMudanca || isSaving) && styles.saveButtonDisabled]}
              disabled={!houveMudanca || isSaving}
              onPress={handleSalvar}
            >
              {isSaving ? (
                <ActivityIndicator color={themes.colors.branco} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar alterações</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themes.colors.branco,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themes.colors.verde,
    marginBottom: 20,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: themes.colors.cinzaTexto,
    marginBottom: 6,
  },
  input: {
    backgroundColor: themes.colors.cinzaBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: themes.colors.preto,
  },
  inputDisabled: {
    justifyContent: 'center',
    opacity: 0.7,
  },
  inputDisabledText: {
    fontSize: 15,
    color: themes.colors.cinzaTexto,
  },
  helperText: {
    fontSize: 11,
    color: themes.colors.cinzaMedio,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: themes.colors.verdeMedio,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: themes.colors.branco,
    fontWeight: '700',
    fontSize: 15,
  },
  signOutButton: {
    marginTop: 32,
    alignItems: 'center',
    paddingVertical: 12,
  },
  signOutButtonText: {
    color: themes.colors.erro,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: themes.colors.erroBg,
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    color: themes.colors.erro,
  },
});