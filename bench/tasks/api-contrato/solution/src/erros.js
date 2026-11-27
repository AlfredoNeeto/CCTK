// Erros do domínio que as rotas traduzem em status HTTP (veja responderErro em src/rotas.js).
export class NaoEncontrado extends Error {}
export class Invalido extends Error {}
export class Conflito extends Error {}
