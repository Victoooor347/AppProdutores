// Configuração dos testes automatizados (Jest). Rode com: npm test
// Os testes ficam em pastas __tests__ ao lado do código que eles testam.

// Endereço fictício da API, só para os testes: nenhuma requisição de verdade sai (o fetch é
// simulado dentro de cada teste). Precisa ser definido aqui, antes de tudo, porque o Expo
// embute as variáveis EXPO_PUBLIC_* no código na hora de compilar.
process.env.EXPO_PUBLIC_API_URL = 'https://api.teste.local';

// Fuso fixo, para os testes de data/hora darem o mesmo resultado em qualquer computador.
process.env.TZ = 'America/Sao_Paulo';

module.exports = {
  preset: 'jest-expo',
};
