import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { themes } from '../../global/themes';
import { style } from '../../global/styles';
import logo from '../../assets/logo.png';

type Props = {
  title: string;
};

export default function AppHeader({ title }: Props) {
  return (
    <View style={style.containerH}>
      <Image source={logo} style={style.logoH} resizeMode="contain" />
      <Text style={style.titleH}>{title}</Text>
    </View>
  );
}
