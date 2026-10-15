const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { simularBanco } = require('../../testes/ferramentas');
const {
  mascararEmail,
  montarEmailCodigo,
  criarCodigo,
  verificarCodigo,
} = require('../codigoService');

let banco;
afterEach(() => banco?.restaurar());

// Confere que a promessa falha com esse status e um trecho da mensagem
async function deveFalhar(promessa, status, trecho) {
  await assert.rejects(promessa, (erro) => {
    assert.equal(erro.status, status);
    assert.match(erro.message, new RegExp(trecho));
    return true;
  });
}

describe('mascararEmail', () => {
  it('mostra só o começo e o domínio, com quantidade fixa de *', () => {
    assert.equal(mascararEmail('joao.silva@gmail.com'), 'jo****@gmail.com');
    assert.equal(mascararEmail('ab@x.com'), 'a****@x.com');
  });
});

describe('montarEmailCodigo', () => {
  it('escapa o nome no HTML (o nome vem do cadastro)', () => {
    const email = montarEmailCodigo({
      nome: '<script>x</script>',
      email: 'a@b.com',
      codigo: '123456',
      finalidade: 'primeiro_acesso',
    });
    assert.ok(!email.html.includes('<script>'));
    assert.ok(email.html.includes('&lt;script&gt;'));
    assert.equal(email.para, 'a@b.com');
    assert.match(email.assunto, /123456/);
  });
});

describe('criarCodigo', () => {
  it('pediu há menos de 1 minuto: 429 com o tempo de espera', async () => {
    banco = simularBanco((sql) =>
      sql.includes('COUNT(*)') ? { rows: [{ pedidos_na_hora: 1, espera: 42 }] } : undefined
    );
    await deveFalhar(criarCodigo('52998224725', 'recuperar_senha'), 429, 'Aguarde 42 segundos');
    assert.equal(banco.consultasCom('INSERT').length, 0);
  });

  it('5 pedidos na última hora: 429', async () => {
    banco = simularBanco((sql) =>
      sql.includes('COUNT(*)') ? { rows: [{ pedidos_na_hora: 5, espera: null }] } : undefined
    );
    await deveFalhar(criarCodigo('52998224725', 'recuperar_senha'), 429, 'muitos códigos');
  });

  it('dentro do limite: gera um código de 6 dígitos e grava só o hash', async () => {
    banco = simularBanco((sql) => {
      if (sql.includes('COUNT(*)')) return { rows: [{ pedidos_na_hora: 0, espera: null }] };
      if (sql.includes('INSERT')) return { rows: [{ id: 'id-1' }] };
      return undefined;
    });

    const { id, codigo } = await criarCodigo('52998224725', 'primeiro_acesso');

    assert.equal(id, 'id-1');
    assert.match(codigo, /^\d{6}$/);
    const [insert] = banco.consultasCom('INSERT');
    assert.match(insert.sql, /crypt\(\$3, gen_salt\('bf'\)\)/); // o banco grava o hash, não o código
  });
});

describe('verificarCodigo', () => {
  // Simula o último código do CPF no banco com esses dados
  function codigoNoBanco(dados) {
    banco = simularBanco((sql) => {
      if (sql.includes('FROM verification_codes')) {
        return {
          rows: [{ id: 'c1', attempts: 0, used_at: null, expirado: false, confere: true, ...dados }],
        };
      }
      if (sql.includes('SET used_at')) return { rowCount: 1 };
      return undefined;
    });
  }

  it('código certo: marca como usado', async () => {
    codigoNoBanco({});
    await verificarCodigo('52998224725', 'recuperar_senha', '123456');
    assert.equal(banco.consultasCom('SET used_at').length, 1);
  });

  it('código errado: conta a tentativa e diz quantas sobram', async () => {
    codigoNoBanco({ confere: false, attempts: 1 });
    await deveFalhar(verificarCodigo('52998224725', 'recuperar_senha', '000000'), 400, '3 tentativas');
    assert.equal(banco.consultasCom('attempts = attempts + 1').length, 1);
  });

  it('5º erro: pede um código novo', async () => {
    codigoNoBanco({ confere: false, attempts: 4 });
    await deveFalhar(verificarCodigo('52998224725', 'recuperar_senha', '000000'), 400, 'Peça um novo');
  });

  it('já bloqueado por erros: recusa até o código certo', async () => {
    codigoNoBanco({ confere: true, attempts: 5 });
    await deveFalhar(verificarCodigo('52998224725', 'recuperar_senha', '123456'), 400, 'Muitas tentativas');
    assert.equal(banco.consultasCom('SET used_at').length, 0);
  });

  it('expirado: recusa', async () => {
    codigoNoBanco({ expirado: true });
    await deveFalhar(verificarCodigo('52998224725', 'recuperar_senha', '123456'), 400, 'expirou');
  });

  it('já usado: recusa (uso único)', async () => {
    codigoNoBanco({ used_at: new Date() });
    await deveFalhar(verificarCodigo('52998224725', 'recuperar_senha', '123456'), 400, 'Não há código válido');
  });

  it('duas confirmações ao mesmo tempo: só a primeira vale', async () => {
    banco = simularBanco((sql) => {
      if (sql.includes('FROM verification_codes')) {
        return { rows: [{ id: 'c1', attempts: 0, used_at: null, expirado: false, confere: true }] };
      }
      return { rowCount: 0 }; // o UPDATE ... AND used_at IS NULL não achou: a outra já usou
    });
    await deveFalhar(verificarCodigo('52998224725', 'recuperar_senha', '123456'), 400, 'já foi usado');
  });
});
