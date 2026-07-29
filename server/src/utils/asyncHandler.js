// Express 4 não captura automaticamente erros de handlers async — sem isso,
// um erro (ex: falha de conexão com o banco) derruba a requisição sem
// resposta nenhuma pro app, em vez de cair no error handler e devolver um
// JSON de erro decente.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };