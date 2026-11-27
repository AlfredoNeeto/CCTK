// Notificações enviadas aos clientes (em memória, para os testes).
export const enviadas = [];
export const enviar = (clienteId, mensagem) => { enviadas.push({ clienteId, mensagem }); };
export const limpar = () => { enviadas.length = 0; };
