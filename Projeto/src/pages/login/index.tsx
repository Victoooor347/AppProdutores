import React, { useState } from "react";
import { Text, View, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { style } from '../../global/styles';
import logo from '../../assets/logo.png';
import { useAuth } from "../../context/authContext";
import { formatCpf, isValidCpf, isValidPassword, MIN_PASSWORD_LENGTH } from "../../utils/validators";

export default function Login() {

    const { signIn } = useAuth();

    const [cpf, setCpf] = useState('');
    const [password, setPassword] = useState('');
    const [Loading, setLoading] = useState(false);

    // Atalho só para desenvolvimento: digitar "V" nos dois campos usa o
    // login mock (ver authService.ts) sem precisar de um CPF válido.
    // Em produção, essa combinação nunca vai bater com uma senha real.
    const isDevShortcut = __DEV__ && cpf.toUpperCase() === 'V' && password === 'V';

    function handleCpfChange(text: string) {
        // Permite digitar o atalho de dev sem a máscara apagar o "V".
        if (__DEV__ && text.toUpperCase() === 'V') {
            setCpf(text);
            return;
        }
        setCpf(formatCpf(text));
    }

    function validateForm(): string | null {
        if (isDevShortcut) return null;

        if (!cpf || !password) {
            return 'Por favor, preencha todos os campos.';
        }
        if (!isValidCpf(cpf)) {
            return 'CPF inválido. Verifique os números digitados.';
        }
        if (!isValidPassword(password)) {
            return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
        }
        return null;
    }

    async function handleLogin() {
        const validationError = validateForm();
        if (validationError) {
            Alert.alert('Atenção', validationError);
            return;
        }

        setLoading(true);
        try {
            await signIn(cpf, password);
        } catch (error: any) {
            Alert.alert('Erro', error?.message ?? 'Não foi possível fazer login.');
        } finally {
            setLoading(false);
        }
    }


  return (
    <View style={style.container}>
      <View style={style.boxTop}>
            <Image
                source={logo}
                style={style.logo}
                resizeMode="contain"
            />
            <Text style={style.text}>Acesso exclusivo para produtores!</Text>
        </View>  
        <View style={style.boxMid}>
            <Text style={style.titleinput}>CPF</Text>
            <TextInput
                style={style.placeholder}
                placeholder="Digite seu CPF"
                value={cpf}
                onChangeText={handleCpfChange}
                //keyboardType={__DEV__ ? 'default' : 'numeric'}
                keyboardType={ 'numeric' }
                maxLength={14}
                placeholderTextColor={style.placeholder.color}
            />
            <Text style={style.titleinput}>Senha</Text>
            <TextInput
                style={style.placeholder}
                placeholder="Digite sua senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={style.placeholder.color}
            />
        </View>
        <View style={style.boxBottom}> 
            <TouchableOpacity style={style.button} onPress={() => handleLogin()}>
                {Loading ? 
                    <ActivityIndicator color="#fff" size={"small"}/>
                :
                    <Text style={style.textbutton}>Entrar</Text>}    
            </TouchableOpacity>
            <Text style={style.endPage}>Não tem acesso? Entre em contato com a gente.</Text>
          </View>
          
    </View>
  );
}