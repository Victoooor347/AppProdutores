import React, { useState } from "react";
import { View, Text, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { useAuth } from "../context/authContext";
import { style } from "../global/styles";
import AppHeader from "../components/AppHeader";
import { themes } from "../global/themes";

export default function User() {
  
  const { user, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false)

  function handleRefresh(): void {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }

  return (
    <View style={style.screenDB}>
      <AppHeader title="Dickow Produtores" />
      <ScrollView
          contentContainerStyle={style.contentDB}
          refreshControl={
          <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[themes.colors.verdeMedio]}
          />
        }
      >
      </ScrollView>

    <View style={style.containerPerfil}>
      <Text>Exemplo de página do user</Text>
      <Text>CPF logado: {user?.cpf}</Text>
      <TouchableOpacity
        onPress={signOut}
        style={style.bottomLogout}
      >
        <Text style={{ color: '#fff' }}>Sair</Text>
      </TouchableOpacity>
    </View>
    </View>
  );
}