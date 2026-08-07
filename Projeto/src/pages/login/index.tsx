import React, { useState } from "react"; // Importa o React e o hook useState para gerenciar o estado do componente
import { 
    Text, 
    View, 
    Image, 
    TextInput, // Importa componentes do React Native para criar a interface do usuário
    TouchableOpacity, // Componente que permite criar botões e áreas clicáveis
    Alert, // Componente para exibir alertas e mensagens de erro
    ActivityIndicator // Componente que exibe um indicador de carregamento (spinner)
} from 'react-native';
import { style } from '../../global/styles';
import logo from '../../assets/logo.png';
import { useAuth } from "../../context/authContext"; // Importa o hook useAuth do contexto de autenticação para acessar funções e estados relacionados à autenticação
import { 
    formatCpf, // Função para formatar o CPF digitado pelo usuário
    isValidCpf, // Função para validar se o CPF digitado é válido
    isValidPassword, // Função para validar se a senha digitada atende aos critérios de segurança
    MIN_PASSWORD_LENGTH // Constante que define o comprimento mínimo da senha
} from "../../utils/validators";


export default function Login() {

    // Importa a função signIn do contexto de autenticação para realizar o login do usuário
    const { signIn } = useAuth();

    // Estado local para armazenar o CPF, a senha e o estado de carregamento do login
    const [cpf, setCpf] = useState('');
    const [password, setPassword] = useState('');
    const [Loading, setLoading] = useState(false);

    // // Verifica se o usuário digitou o atalho de desenvolvimento (V/V) para permitir login rápido durante o desenvolvimento
    // const isDevShortcut = __DEV__ && cpf.toUpperCase() === 'V' && password === 'V';

    // Função para lidar com a mudança no campo de CPF, formatando o valor digitado e permitindo o atalho de desenvolvimento
    function handleCpfChange(text: string) {
        // Permite digitar o atalho de dev sem a máscara apagar o "V".
        if (__DEV__ && text.toUpperCase() === 'V') {
            setCpf(text);
            return;
        }
        setCpf(formatCpf(text));
    }

    // Função para validar o formulário de login, verificando se os campos estão preenchidos e se os valores são válidos
    function validateForm(): string | null {
        // if (isDevShortcut) return null;

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

    // Função assíncrona para lidar com o processo de login, validando o formulário e chamando a função signIn do contexto de autenticação
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