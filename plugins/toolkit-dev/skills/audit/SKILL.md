---
name: audit
description: Analisa se uma skill, plugin, servidor MCP, extensão ou projeto open source é seguro ANTES de instalar ou rodar. Use quando pedirem para auditar, verificar a segurança, "é seguro instalar?", "posso rodar esse repo?" ou antes de qualquer /plugin install, claude mcp add, npx ou git clone de terceiros.
argument-hint: <url do git | pasta local | pacote npm/pypi>
---

# Auditoria de terceiros

Alvo: $ARGUMENTS

Regra absoluta: **nada do alvo é executado**. Nada de `npm install`, `pip install`, `npx`, `uvx`,
scripts, `make` ou testes do alvo, nem abrir o Claude Code dentro da pasta dele.

## 1. Pôr em quarentena

Crie uma pasta nova e vazia no diretório temporário do sistema (ex.: `<tmp>/toolkit-quarantine/<nome>-<data>`).

| Alvo | Como trazer |
|---|---|
| URL git | `git clone --depth 1 --no-recurse-submodules <url> <pasta>` (o clone não executa hooks do repositório) |
| Pacote npm | `npm pack <pacote>@<versão> --pack-destination <pasta>` e extraia com `tar -xzf` (o pack não roda scripts) |
| Pacote PyPI | `pip download --no-deps --no-binary :all: <pacote>==<versão> -d <pasta>` e extraia |
| Pasta local | Use a pasta como está, sem rodar nada |

Anote também o commit (`git rev-parse HEAD`) ou a versão exata auditada.

## 2. Contexto do projeto

Se for GitHub, consulte a API pública sem autenticação (`https://api.github.com/repos/<dono>/<repo>`):
idade, estrelas, data do último push, se está arquivado e se o dono é uma organização conhecida.
Para npm: `npm view <pacote> time maintainers repository`. Um projeto novo, de dono sem histórico e
com nome parecido com um projeto famoso é um sinal de alerta (typosquatting).

## 3. Análise

Delegue ao subagente `third-party-auditor`, passando o caminho da quarentena e o tipo do alvo.
Ele lê o código sozinho e devolve o veredito. Isso mantém a leitura dos arquivos fora desta conversa.

## 4. Entregar

Mostre o veredito do subagente, a versão ou o commit auditado e o contexto do passo 2.
- **PODE INSTALAR:** fixe a versão auditada na instalação (ex.: `pacote@1.2.3`, plugin num commit específico).
- **COM RESSALVAS:** diga exatamente o que restringir (ex.: `allowed-tools`, desligar um hook, `permissions.deny`).
- **NÃO INSTALE:** liste os achados críticos. Não ofereça um jeito de contornar.

Ao terminar, apague a pasta de quarentena.
