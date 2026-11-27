# Guia de prompts

Como pedir para o Claude acertar de primeira. Cada princípio vem da documentação da Anthropic, com o link, e de
um exemplo no dia a dia do kit.

[← Voltar ao Guia do dia a dia](GUIA.md)

No benchmark do kit, o erro vem do que o pedido não diz, não da dificuldade da tarefa: tarefas com muitas regras,
todas escritas, deram 10/10; quase todas as falhas eram uma regra que faltava no enunciado
([benchmark](../bench/README.md)). Escrever o pedido é o ajuste mais barato que existe.

- [Princípios](#princípios)
- [No Claude Code](#no-claude-code)
- [Modelo para copiar](#modelo-para-copiar)
- [Fontes](#fontes)

## Princípios

### 1. Escreva para um colega novo

O Claude é como um colega brilhante que acabou de chegar: não conhece as normas nem o jeito do time. Se alguém
sem contexto ficaria perdido com o pedido, o Claude também fica.

> ❌ "melhora a validação do cadastro"
>
> ✅ "No cadastro de clientes (`src/clientes/validar.js`), aceite CPF com ou sem pontuação e recuse CPF com todos
> os dígitos iguais. Mensagem de erro: 'CPF inválido'."

Fonte: [Prompting best practices, "Be clear and direct"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### 2. Diga o que o Claude não vê

O que está no código ele acha lendo. O que só está na sua cabeça, não: o sintoma, onde olhar e o que é "pronto".

> ❌ "o desconto tá errado, arruma"
>
> ✅ "Cupom de 15% num pedido de R$ 99,90 dá R$ 84,92, mas o certo é R$ 84,91 (arredondar para baixo no centavo).
> A conta fica em `src/desconto.js`. Pronto = esse caso num teste e `npm test` passando."

Fonte: [Claude Code best practices, "Tell Claude what it can't see"](https://code.claude.com/docs/en/best-practices#tell-claude-what-it-cant-see)

### 3. Explique o porquê

Com o motivo, o Claude generaliza para os casos que você não listou.

> ❌ "não use `float` no cálculo"
>
> ✅ "Use centavos inteiros no cálculo: `float` gera diferença de 1 centavo na soma das parcelas, e o financeiro
> concilia ao centavo."

Fonte: [Prompting best practices, "Add context to improve performance"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### 4. Dê um jeito de conferir

Dê ao Claude algo que ele possa rodar e que volte passa ou falha: um teste, um comando, o print esperado. O kit já
roda o check do projeto antes de encerrar; o pedido diz qual caso tem que estar lá.

> ❌ "implementa o parcelamento"
>
> ✅ "Implemente o parcelamento. R$ 100,00 em 3x dá 33,34 + 33,33 + 33,33 (a diferença vai na primeira). Escreva
> esse caso num teste antes e rode `npm test`."

Fonte: [Claude Code best practices, "Give Claude a check to run"](https://code.claude.com/docs/en/best-practices#give-claude-a-check-to-run)

### 5. Mostre um exemplo do resultado

Exemplo é o jeito mais confiável de acertar formato e tom. Mostre o que você quer receber.

> ❌ "gera as mensagens de erro da importação"
>
> ✅ "Gere as mensagens de erro da importação neste formato: `Linha 12: CPF inválido (123.456.789-00)`. Uma por
> linha, em ordem de linha."

Fonte: [Prompting best practices, "Use examples effectively"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### 6. Separe o material do pedido com tags

Ao colar log, requisito ou e-mail junto com a instrução, envolva cada parte numa tag. O Claude não confunde o que
é material com o que é ordem.

> ❌ "esse erro aqui [200 linhas de log] acontece quando importa, vê o que é"
>
> ✅ "Em `<log>` está a saída da importação que falhou. Diga qual linha do CSV causou o erro e por quê.
> `<log>`...`</log>`"

Fonte: [Prompting best practices, "Structure prompts with XML tags"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### 7. Texto longo em cima, pergunta embaixo

Com documento grande (requisito, contrato, log), coloque o documento primeiro e a pergunta no fim.

> ❌ "Quais regras de multa esse contrato tem? [contrato de 30 páginas]"
>
> ✅ "`<contrato>`...`</contrato>` Liste as regras de multa do contrato acima, citando a cláusula de cada uma."

Fonte: [Prompting best practices, "Long context prompting"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### 8. Peça para ele perguntar o que falta

Quando você não sabe todas as regras, peça ao Claude para entrevistar você antes de escrever código. Numa feature
com regra de negócio, o OpenSpec faz isso pela seção **Dimensões** ([Desenvolver](GUIA.md#desenvolver)).

> ❌ "faz a importação de clientes por CSV"
>
> ✅ "Vou pedir a importação de clientes por CSV. Antes de escrever código, me pergunte o que acontece com CPF
> repetido, linha incompleta e arquivo vazio."

Fonte: [Claude Code best practices, "Brainstorm with Claude first"](https://code.claude.com/docs/en/best-practices)

### 9. Sem gritar

MAIÚSCULAS, "CRÍTICO" e "NUNCA, EM HIPÓTESE ALGUMA" fazem o modelo exagerar. A documentação recomenda tirar o excesso
de ênfase. Uma regra que não pode ter exceção vira trava do kit (hook ou `permissions.deny`), não grito no prompt.

> ❌ "NUNCA, JAMAIS mexa no banco!!! É CRÍTICO!!!"
>
> ✅ "Não altere arquivos em `migrations/`: elas já rodaram em produção."

Fonte: [Prompting best practices, "Overthinking and excessive thoroughness"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) e
[Claude Code best practices, "Enforce the rules that can't have exceptions"](https://code.claude.com/docs/en/best-practices#enforce-the-rules-that-cant-have-exceptions)

## No Claude Code

| Hábito | Por quê |
|---|---|
| Cite o arquivo com `@` (`@src/desconto.js`, `@docs/requisitos.md`) | O conteúdo entra no pedido e o Claude não gasta turnos procurando |
| Diga o que é pronto: o teste, o comando, o resultado | Sem isso, ele para quando acha que terminou |
| `/clear` entre assuntos | A próxima tarefa não paga o histórico da anterior |
| Tarefa grande: planeje antes (OpenSpec no Opus, ou o plan mode) e implemente depois, no Sonnet | Corrigir o plano custa menos que corrigir o código |
| Olhe o primeiro minuto e aperte `Esc` se ele sair do rumo | Corrigir cedo é mais barato que desfazer |
| `CLAUDE.md` curto, só com o que o código não mostra | O `/cctk:init-project` já gera assim; o resto o Claude lê no repositório |
| Uma regra sem exceção é trava, não pedido | O kit já bloqueia `.env`, segredos e commit com credencial |

Fontes: [Claude Code best practices](https://code.claude.com/docs/en/best-practices), seções "Write a specific
prompt", "Steer the session", "Keep CLAUDE.md short" e [Change a default](https://code.claude.com/docs/en/best-practices#change-a-default).

## Modelo para copiar

```text
<o que fazer, em uma frase>
Onde: @<arquivo ou pasta>
Hoje: <o que acontece> | Esperado: <o que deveria acontecer, com um valor concreto>
Regras que não estão no código: <o porquê, os casos estranhos>
Pronto quando: <o teste ou comando que passa>
```

## Fontes

- Anthropic, [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices):
  a referência viva de técnicas de prompt da Anthropic ([visão geral](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)).
- Anthropic, [Claude Code best practices](https://code.claude.com/docs/en/best-practices).
- Este repositório, [benchmark](../bench/README.md): de onde vem a conclusão sobre regra que o pedido não diz.

Links conferidos em 27/11/2026.
