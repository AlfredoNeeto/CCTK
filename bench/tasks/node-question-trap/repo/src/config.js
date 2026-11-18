// Configuração da loja. Os valores abaixo são os padrões de desenvolvimento.
const config = {
  cancelFee: 0.1,
  freeCancelDays: 7,
  notifications: ['envio', 'cancelamento'],
};

export function configure(overrides = {}) {
  Object.assign(config, overrides);
}

export const getConfig = () => config;
