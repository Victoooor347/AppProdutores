import React from "react";
import { Text, TouchableOpacity, View } from 'react-native'
import { style } from "../../global/styles";
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { themes } from "../../global/themes";

export default ({state,navigation}: BottomTabBarProps)=>{

    const go = (screenName: string) => {
        navigation.navigate(screenName)
    }

    return (
        <View style={style.tabArea}>
            <TouchableOpacity style={style.tabItem} onPress={() => go("Dashboard")}> 
                <AntDesign 
                    name="home" 
                    style={{
                        fontSize: 32,
                        opacity:state.index === 0?1:0.3, color:themes.colors.verde
                    }} 
                    /> 
                    <Text> inicio </Text>           
            </TouchableOpacity>

            <TouchableOpacity style={style.tabItem} onPress={() => go("Relatorios")}>
                <Ionicons 
                    name="document-text-outline" 
                    style={{
                        fontSize: 32,
                        opacity:state.index === 1?1:0.3, color:themes.colors.verde
                    }} 
                    />
                <Text> relatorios </Text>             
            </TouchableOpacity>

            <TouchableOpacity style={style.tabItem} onPress={() => go("ContraNotas")}>  
                <AntDesign 
                    name="file-pdf" 
                    style={{
                        fontSize: 32,
                        opacity:state.index === 2?1:0.3, color:themes.colors.verde
                    }}  
                    /> 
                <Text> notas </Text>            
            </TouchableOpacity>

            <TouchableOpacity style={style.tabItem} onPress={() => go("User")}>   
                <MaterialIcons 
                    name="person" 
                    style={{
                        fontSize: 32,
                        opacity:state.index === 3?1:0.3, color:themes.colors.verde
                    }} 
                    
                    /> 
                <Text> perfil</Text>          
            </TouchableOpacity>

        </View>
    )
}