import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from '../pages/login';
import BottomRoutes from './bottom.routes';
import { useAuth } from '../context/authContext';

export default function Routes() {
  const Stack = createStackNavigator();
  const { isAuthenticated, isLoading } = useAuth();

  // Enquanto verificamos se já existe uma sessão salva no dispositivo,
  // evitamos "piscar" a tela de login antes de ir para o app.
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