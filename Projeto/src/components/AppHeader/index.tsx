import React from 'react';
import { View, Text, Image } from 'react-native';
import { style } from '../../global/styles';
import logo from '../../assets/logo.png';

type Props = {
  title: string;
};

// Componente de cabeçalho do aplicativo, exibindo o logotipo e o título da tela.
export default function AppHeader({ title }: Props) {
  return (
    <View style={style.containerH}>
      <Image source={logo} style={style.logoH} resizeMode="contain" />
      <Text style={style.titleH}>{title}</Text>
    </View>
  );
}
