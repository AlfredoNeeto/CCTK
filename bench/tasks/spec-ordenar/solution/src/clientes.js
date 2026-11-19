// Listagem de clientes.
export function ordenarClientes(clientes) {
  return [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}
