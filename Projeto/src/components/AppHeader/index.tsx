import React from 'react';
import { View, Text, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { style } from '../../global/styles';
import logo from '../../assets/logo.png';

type Props = {
  title: string;
};

// Componente de cabeçalho do aplicativo, exibindo o logotipo e o título da tela.
export default function AppHeader({ title }: Props) {
  // Altura da barra de status (e do notch, no iPhone) deste aparelho —
  // o cabeçalho começa logo abaixo dela, em vez de usar um valor fixo.
  const insets = useSafeAreaInsets();

  return (
    <View style={[style.containerH, { paddingTop: insets.top + 16 }]}>
      {/* Ícones da barra de status (hora, bateria) em branco, pra aparecer sobre o verde */}
      <StatusBar style="light" />
      <Image source={logo} style={style.logoH} resizeMode="contain" />
      <Text style={style.titleH}>{title}</Text>
    </View>
  );
}
