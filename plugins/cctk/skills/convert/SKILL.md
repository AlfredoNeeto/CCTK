---
name: convert
description: Converte documentos (PDF, DOCX, PPTX, XLSX, HTML) para Markdown em docs/, para depois citar com @docs/arquivo.md. Usa MarkItDown e, quando o PDF tem tabelas ou é digitalizado, Docling.
argument-hint: <arquivo> [saída.md]
disable-model-invocation: true
---

# Converter documento para Markdown

Entrada: $ARGUMENTS. Sem saída informada, grave em `docs/<nome-do-arquivo>.md`.

1. **MarkItDown primeiro** (leve e rápido):
   `uvx --from "markitdown[all]" markitdown "<arquivo>" -o "<saída>"`
2. **Confira o resultado** sem ler o arquivo inteiro: veja o tamanho e as primeiras 60 linhas.
   Troque para o Docling quando:
   - o arquivo é PDF e tem tabelas, mas a saída não tem linhas `|`, ou elas saem desalinhadas;
   - o PDF é digitalizado (a saída sai quase vazia);
   - o texto sai embaralhado (colunas misturadas, cabeçalho no meio de frases).
3. **Docling** (mais fiel, mas pesado: baixa modelos de alguns GB na primeira vez e é lento em CPU).
   Avise o usuário antes de rodar a primeira vez:
   `uvx docling "<arquivo>" --to md --output "<pasta-de-saída>"`
4. Termine dizendo qual ferramenta foi usada, o caminho do .md e o número de linhas. Sugira citar
   com `@<saída>` em vez de colar o conteúdo na conversa.

Não resuma nem reescreva o conteúdo: o objetivo é uma cópia fiel em Markdown.
