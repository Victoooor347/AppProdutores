import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { style } from '../../global/styles';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'; // Importa o tipo BottomTabBarProps do React Navigation para tipar as props do componente CustomTabBar
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons'; // Importa os ícones do pacote @expo/vector-icons para serem usados na barra de navegação
import { themes } from '../../global/themes';

// Altura da barra de abas, sem contar a área da barra de navegação do celular.
const TAB_BAR_HEIGHT = 80;

// Componente de barra de navegação personalizada para a aplicação, exibindo ícones e textos para cada aba.
export default function CustomTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const go = (screenName: string) => {
    navigation.navigate(screenName);
  };

  return (
    // insets.bottom = altura da barra de gestos/botões do Android ou da barra inferior do iPhone.
    // Os ícones ficam acima dela, em vez de embaixo.
    <View
      style={[
        style.tabArea,
        { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <TouchableOpacity style={style.tabItem} onPress={() => go('Dashboard')}>
        <AntDesign
          name="home"
          style={{
            fontSize: 32,
            opacity: state.index === 0 ? 1 : 0.3,
            color: themes.colors.verde,
          }}
        />
        <Text> Início </Text>
      </TouchableOpacity>

      <TouchableOpacity style={style.tabItem} onPress={() => go('Relatorios')}>
        <Ionicons
          name="document-text-outline"
          style={{
            fontSize: 32,
            opacity: state.index === 1 ? 1 : 0.3,
            color: themes.colors.verde,
          }}
        />
        <Text> Relatórios </Text>
      </TouchableOpacity>

      <TouchableOpacity style={style.tabItem} onPress={() => go('ContraNotas')}>
        <AntDesign
          name="file-pdf"
          style={{
            fontSize: 32,
            opacity: state.index === 2 ? 1 : 0.3,
            color: themes.colors.verde,
          }}
        />
        <Text> Contra-Notas </Text>
      </TouchableOpacity>

      <TouchableOpacity style={style.tabItem} onPress={() => go('User')}>
        <MaterialIcons
          name="person"
          style={{
            fontSize: 32,
            opacity: state.index === 3 ? 1 : 0.3,
            color: themes.colors.verde,
          }}
        />
        <Text> Perfil </Text>
      </TouchableOpacity>
    </View>
  );
}
