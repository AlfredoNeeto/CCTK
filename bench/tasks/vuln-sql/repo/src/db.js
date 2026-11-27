import { DatabaseSync } from 'node:sqlite';

// Banco em memória com os clientes de exemplo.
export const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL, email TEXT NOT NULL);
  INSERT INTO clientes (nome, cidade, email) VALUES
    ('Ana Souza', 'Cuiabá', 'ana@exemplo.com'),
    ('Bruno Lima', 'Curitiba', 'bruno@exemplo.com'),
    ('Carla Dias', 'Cuiabá', 'carla@exemplo.com'),
    ('Daniel Rocha', 'Recife', 'daniel@exemplo.com');
`);
