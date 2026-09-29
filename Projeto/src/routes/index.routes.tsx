import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator, StackNavigationOptions } from '@react-navigation/stack';
import Login from '../pages/login';
import SolicitarCodigo from '../pages/solicitarCodigo';
import ConfirmarCodigo from '../pages/confirmarCodigo';
import BottomRoutes from './bottom.routes';
import { useAuth } from '../context/authContext';
import { RootStackParamList } from '../types/navigation';
import { themes } from '../global/themes';

// Cria o Stack Navigator para gerenciar a navegação entre as telas de login e as rotas principais da aplicação.
// Fica fora do componente de propósito: criado lá dentro, ele seria recriado a cada renderização
// e o React Navigation remontaria todas as telas (perdendo o estado delas).
const Stack = createStackNavigator<RootStackParamList>();

// Cabeçalho verde com botão de voltar, usado nas telas de primeiro acesso / recuperação de senha
const opcoesTelaCodigo: StackNavigationOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: themes.colors.verde },
  headerTintColor: themes.colors.branco,
  headerBackTitle: 'Voltar',
};

export default function Routes() {
  const { isAuthenticated, isLoading } = useAuth();

  // Exibe um indicador de carregamento enquanto o estado de autenticação está sendo verificado
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor: '#FFF',
        },
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="BottomRoutes" component={BottomRoutes} />
      ) : (
        // Telas de quem ainda não entrou: login, primeiro acesso e recuperação de senha
        <>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen
            name="SolicitarCodigo"
            component={SolicitarCodigo}
            options={({ route }) => ({
              ...opcoesTelaCodigo,
              title:
                route.params.finalidade === 'primeiro_acesso'
                  ? 'Primeiro acesso'
                  : 'Esqueci minha senha',
            })}
          />
          <Stack.Screen
            name="ConfirmarCodigo"
            component={ConfirmarCodigo}
            options={{ ...opcoesTelaCodigo, title: 'Confirmar código' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
