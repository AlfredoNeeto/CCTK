---
name: secret
description: Explica como gravar, listar e remover variáveis no cofre do toolkit, e mostra quais nomes estão disponíveis (nunca os valores).
disable-model-invocation: true
---

# Cofre de variáveis

Os valores **nunca** passam por esta conversa. Quem grava é você, num terminal fora do Claude Code:

```
cctk secret set NOME     # pede o valor sem mostrar na tela
cctk secret list         # só os nomes
cctk secret rm NOME
```

Depois de gravar, rode `/clear` ou abra uma sessão nova: o cofre é carregado no início da sessão.

Para mostrar os nomes disponíveis agora, use os nomes que vieram no contexto da sessão
("Variáveis de ambiente disponíveis..."). Não leia o arquivo do cofre: ele está bloqueado e o
acesso seria negado.

Como usar uma variável num comando: `$NOME` no bash e `$env:NOME` no PowerShell, sempre dentro do
comando que precisa dela (ex.: `curl -H "Authorization: Bearer $API_TOKEN" ...`), nunca com `echo`.

Limites:
- No Windows, valores com `/` ou `\` (URLs, connection strings) não chegam ao PowerShell. Para esses,
  grave a variável como variável de ambiente do usuário e reinicie o Claude Code.
- O bloqueio evita vazamento acidental. Um programa que o próprio Claude escreva ainda consegue ler
  o ambiente. Por isso, use no cofre credenciais de desenvolvimento, nunca de produção.
