// Erro com status HTTP: o tratamento de erro do index.js devolve { message } com esse status.
function erroHttp(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = { erroHttp };
