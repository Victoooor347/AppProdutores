import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from '../pages/login';
import BottomRoutes from './bottom.routes';
import { useAuth } from '../context/authContext';

export default function Routes() {
  // Cria o Stack Navigator para gerenciar a navegação entre as telas de login e as rotas principais da aplicação
  const Stack = createStackNavigator();
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
          backgroundColor: '#FFF'
        }
      }}>

      {isAuthenticated ? (
        <Stack.Screen
          name="BottomRoutes"
          component={BottomRoutes}
        />
      ) : (
        <Stack.Screen
          name="Login"
          component={Login}
        />
      )}
    </Stack.Navigator>
  )

}