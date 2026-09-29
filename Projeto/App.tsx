import Routes from './src/routes/index.routes';
import { NavigationContainer } from '@react-navigation/native'; // Importa o componente NavigationContainer do React Navigation, que é o contêiner principal para a navegação da aplicação
import { SafeAreaProvider } from 'react-native-safe-area-context'; // Mede as áreas ocupadas pelo sistema (barra de status, notch, barra de navegação) e repassa pro AppHeader e pra CustomTabBar
import { AuthProvider } from './src/context/authContext'; // Importa o AuthProvider do contexto de autenticação, que fornece o estado de autenticação e funções relacionadas para toda a aplicação

// Componente principal da aplicação,
// que envolve as rotas de navegação com o provedor de autenticação e o contêiner de navegação.
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Routes />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
