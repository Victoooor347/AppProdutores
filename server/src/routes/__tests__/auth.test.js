const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { CPF_TESTE, simularBanco, subirApi } = require('../../testes/ferramentas');

let api;
let banco;
before(async () => {
  api = await subirApi();
});
after(() => api.fechar());
afterEach(() => banco?.restaurar());

// Banco simulado pro login: `erros` tentativas recentes e o resultado da conferência da senha
function bancoDoLogin({ errosPorCpf = 0, errosPorIp = 0, usuario }) {
  banco = simularBanco((sql) => {
    if (sql.includes('FROM tentativas')) {
      return { rows: [{ por_cpf: errosPorCpf, por_ip: errosPorIp }] };
    }
    if (sql.includes('FROM users')) return { rows: usuario ? [usuario] : [] };
    return undefined;
  });
}

const USUARIO = { cpf: CPF_TESTE, name: 'Produtor de Teste', sem_senha: false };

describe('POST /auth/login', () => {
  it('senha certa: devolve a sessão e zera os erros do CPF', async () => {
    bancoDoLogin({ usuario: { ...USUARIO, senha_confere: true } });

    const { status, corpo } = await api.chamar('POST', '/auth/login', {
      corpo: { cpf: '529.982.247-25', password: '123456' },
      token: null,
    });

    assert.equal(status, 200);
    assert.equal(corpo.user.cpf, CPF_TESTE);
    assert.match(corpo.token, /^[0-9a-f]{64}$/);
    assert.equal(corpo.expires_in, 86400);
    assert.equal(banco.consultasCom('DELETE FROM tentativas WHERE tipo').length, 1);
    // O token vai pro banco só como hash
    const [sessao] = banco.consultasCom('INSERT INTO sessions');
    assert.notEqual(sessao.params[1], corpo.token);
  });

  it('senha errada: mensagem genérica e registra a tentativa', async () => {
    bancoDoLogin({ usuario: { ...USUARIO, senha_confere: false } });

    const { status, corpo } = await api.chamar('POST', '/auth/login', {
      corpo: { cpf: CPF_TESTE, password: 'errada' },
      token: null,
    });

    assert.equal(status, 401);
    assert.equal(corpo.message, 'CPF ou senha incorretos.');
    const [registro] = banco.consultasCom('INSERT INTO tentativas');
    assert.deepEqual(registro.params.slice(0, 2), ['login', CPF_TESTE]);
  });

  it('CPF inexistente: mesma mensagem da senha errada (não revela quem tem conta)', async () => {
    bancoDoLogin({ usuario: null });

    const { status, corpo } = await api.chamar('POST', '/auth/login', {
      corpo: { cpf: '00000000191', password: 'x' },
      token: null,
    });

    assert.equal(status, 401);
    assert.equal(corpo.message, 'CPF ou senha incorretos.');
  });

  it('5 erros no CPF: 429, e nem confere a senha', async () => {
    bancoDoLogin({ errosPorCpf: 5, usuario: { ...USUARIO, senha_confere: true } });

    const { status, corpo } = await api.chamar('POST', '/auth/login', {
      corpo: { cpf: CPF_TESTE, password: '123456' },
      token: null,
    });

    assert.equal(status, 429);
    assert.match(corpo.message, /Muitas tentativas/);
    assert.equal(banco.consultasCom('FROM users').length, 0);
  });

  it('20 erros no mesmo IP (CPFs diferentes): 429', async () => {
    bancoDoLogin({ errosPorIp: 20 });

    const { status } = await api.chamar('POST', '/auth/login', {
      corpo: { cpf: CPF_TESTE, password: '123456' },
      token: null,
    });

    assert.equal(status, 429);
  });

  it('senha que não é texto: 400 sem ir no banco', async () => {
    bancoDoLogin({});

    const { status } = await api.chamar('POST', '/auth/login', {
      corpo: { cpf: CPF_TESTE, password: { $ne: '' } },
      token: null,
    });

    assert.equal(status, 400);
    assert.equal(banco.consultas.length, 0);
  });
});

describe('POST /auth/recuperar-senha/solicitar-codigo', () => {
  it('limite de pedidos por IP: 429 antes de dizer se o CPF existe', async () => {
    banco = simularBanco((sql) =>
      sql.includes('FROM tentativas') ? { rows: [{ por_cpf: 0, por_ip: 20 }] } : undefined
    );

    const { status } = await api.chamar('POST', '/auth/recuperar-senha/solicitar-codigo', {
      corpo: { cpf: '00000000191' },
      token: null,
    });

    assert.equal(status, 429);
    assert.equal(banco.consultasCom('FROM users').length, 0);
  });

  it('pedido de CPF inexistente também conta pro limite', async () => {
    banco = simularBanco((sql) =>
      sql.includes('FROM tentativas') ? { rows: [{ por_cpf: 0, por_ip: 0 }] } : undefined
    );

    const { status } = await api.chamar('POST', '/auth/recuperar-senha/solicitar-codigo', {
      corpo: { cpf: '00000000191' },
      token: null,
    });

    assert.equal(status, 404);
    const [registro] = banco.consultasCom('INSERT INTO tentativas');
    assert.deepEqual(registro.params.slice(0, 2), ['pedido_codigo', '00000000191']);
  });
});

describe('rotas protegidas', () => {
  it('sem token: 401', async () => {
    banco = simularBanco();
    const { status } = await api.chamar('GET', '/me', { token: null });
    assert.equal(status, 401);
  });

  it('token revogado (logout): 401', async () => {
    banco = simularBanco((sql) =>
      sql.includes('FROM sessions')
        ? { rows: [{ user_cpf: CPF_TESTE, expires_at: new Date(Date.now() + 60_000), revoked_at: new Date() }] }
        : undefined
    );
    const { status } = await api.chamar('GET', '/me');
    assert.equal(status, 401);
  });

  it('token expirado: 401', async () => {
    banco = simularBanco((sql) =>
      sql.includes('FROM sessions')
        ? { rows: [{ user_cpf: CPF_TESTE, expires_at: new Date(Date.now() - 1000), revoked_at: null }] }
        : undefined
    );
    const { status } = await api.chamar('GET', '/me');
    assert.equal(status, 401);
  });
});
