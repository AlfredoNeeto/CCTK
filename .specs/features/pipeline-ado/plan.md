# Docker e pipeline do Azure DevOps Server, conferidos pelo check

## Problem

Escrever Dockerfile, docker-compose e `azure-pipelines.yml` é trabalho que o Claude faz bem, mas o kit não confere
nada disso: um erro de sintaxe no pipeline só aparece quando alguém faz push e o Azure DevOps Server rejeita o YAML, e
um Dockerfile com problema só aparece no build do servidor. Cada ida e volta gasta tempo do time e cota. Além disso, o
Claude tende a escrever pipeline para o Azure DevOps na nuvem (`vmImage`, agentes da Microsoft), que não existe no
servidor on-premises.

Evidência: pedido do usuário (27/11/2026), que pediu Azure DevOps on-premises. Pela pesquisa de 27/11, o Server
só tem agentes próprios (sem `vmImage`) e o YAML multi-stage existe a partir do Server 2020.

Quando isto sair: o usuário pede "crie o Docker e o pipeline" e uma skill gera os arquivos para o servidor
on-premises dele; o check confere os três arquivos em segundos, sem build e sem rede, sempre que eles existirem.

## Flow

Reusa o check (`.claude/cctk.json`, `check-gate.js`) e o cadastro do Azure DevOps (`cctk ado add`, PAT no cofre).

1. pedido -> `plugins/cctk/skills/pipeline/SKILL.md` (new, door 1) - pergunta a versão do Server e o pool de agentes, gera `Dockerfile`, `.dockerignore`, `docker-compose.yml` e `azure-pipelines.yml`
2. `plugins/cctk/hooks/infra-check.js` (new, door 2) - confere cada arquivo que existir: `docker build --check`, `docker compose config -q`, `uvx check-jsonschema` no pipeline; cada passo com limite curto
3. `.claude/cctk.json` (exists) - o check do projeto ganha `&& node <plugin>/hooks/infra-check.js`
4. out: pipeline e Docker válidos antes do push

## Impact

| Front | What changes |
| --- | --- |
| domain | o check pode chamar o Docker; sem Docker na máquina, o passo do Docker é pulado com aviso (fail-open), nunca reprova |
| projetos existentes | nada muda até o usuário pedir a skill; o check novo pede `cctk trust` de novo |
| stored data | nada a migrar |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| skill nova | `/cctk:pipeline` | estender o `init-project`: ele roda uma vez por projeto, e pipeline se pede quando o projeto já anda |
| validação do pipeline | `uvx check-jsonschema --builtin-schema vendor.azure-pipelines --data-transform azure-pipelines azure-pipelines.yml` | a API de preview do servidor (`_apis/pipelines/{id}/preview`): exige que o pipeline já exista, PAT e rede; vira passo opcional depois |
| validação do Dockerfile | `docker build --check .` quando há Docker | hadolint: GPL-3.0 e binário à parte, sem pacote npm ou pip |

## Criteria

### S1: a skill gera para o servidor on-premises (P1)

**Acceptance Criteria**

1. WHEN o usuário pede `/cctk:pipeline` THEN a skill SHALL perguntar a versão do Azure DevOps Server e o nome do pool de agentes, a menos que o `AGENTS.md` já diga
2. The `azure-pipelines.yml` gerado SHALL usar `pool: name: <pool>` e nunca `vmImage`
3. IF a versão do Server for 2019 THEN a skill SHALL gerar pipeline de um estágio só, sem `stages`, `environment` e `extends`
4. The skill SHALL gerar `Dockerfile` multi-stage com usuário não-root e `.dockerignore` que exclui `.env`, `secrets/` e `.git`
5. The skill SHALL gravar no `AGENTS.md` a versão do Server e o pool, para a próxima vez

### S2: o check confere (P1)

**Acceptance Criteria**

6. WHEN existir `Dockerfile` e o comando `docker` responder THEN o `infra-check.js` SHALL rodar `docker build --check .` e reprovar se ele sair com código ≠ 0
7. WHEN existir `docker-compose.yml` ou `compose.yaml` e o `docker` responder THEN o `infra-check.js` SHALL rodar `docker compose config -q` e reprovar se sair com código ≠ 0
8. WHEN existir `azure-pipelines.yml` THEN o `infra-check.js` SHALL rodar o `check-jsonschema` com o esquema do Azure Pipelines e reprovar se sair com código ≠ 0
9. IF o `docker` ou o `uvx` não estiverem disponíveis, ou um passo passar de 30 segundos THEN o `infra-check.js` SHALL pular esse passo com um aviso, sem reprovar
10. IF nenhum dos arquivos existir THEN o `infra-check.js` SHALL sair com 0 sem rodar nada

### S3: entra só se medir bem (P2)

**Acceptance Criteria**

11. The bench SHALL ter uma tarefa `pipeline-ado` (API .NET pequena) cujo corretor oculto valida os três arquivos com as mesmas ferramentas, reprova `vmImage` e confere usuário não-root no Dockerfile
12. The peça SHALL entrar no kit só se, na tarefa `pipeline-ado`, o kit com a skill acertar mais que sem ela, com no máximo +15% de custo por acerto

**Independent test:** um `azure-pipelines.yml` com `steps` mal indentado faz o check reprovar; o mesmo arquivo corrigido passa.

## Out of scope

| Excluded | Why |
| --- | --- |
| rodar o build Docker completo no check | passa dos 3 minutos |
| dry run na API do servidor | ver Landing; candidato a passo opcional com o PAT do `cctk ado add` |
| GitHub Actions | o pedido é Azure DevOps on-premises |
| deploy (Kubernetes, IIS) | o pipeline gera e publica a imagem; o deploy varia demais por empresa |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| versão mínima do Server | 2020 para multi-stage, 2019 com pipeline simples | o YAML multi-stage chegou no Server 2020 (pesquisa de 27/11) | n |
| nome do esquema no check-jsonschema | `vendor.azure-pipelines` | consta na documentação do check-jsonschema; conferir no build | n |
| limite por passo | 30 s | três passos cabem com folga nos 3 minutos do check | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| comando `infra-check.js` | exit codes | AC 6-10 |
| comando `infra-check.js` | o que imprime ao pular um passo | AC 9 |
| skill `/cctk:pipeline` | o que pergunta | AC 1 |
| doc `AGENTS.md` | o que grava | AC 5 |

## Sources

- Pedido do usuário (27/11/2026), Azure DevOps on-premises
- Pesquisa de 27/11: Docker build checks (https://docs.docker.com/build/checks/), Azure DevOps Server release notes, check-jsonschema
