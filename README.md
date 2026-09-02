# QA Nutricional — Avaliador LLM (Voy)

Artifact React que roda dentro do claude.ai e pontua a qualidade de consultas nutricionais (SOAP + orientação ao paciente) com a rubrica calibrada da equipe de nutrição. A linha resultante é colada à mão na planilha **QA Semanal**.

| | |
|---|---|
| Código | `src/qa_nutricional.jsx` (único arquivo em produção) |
| Rubrica legível | `prompt/rubrica.md` (mesmo texto das constantes do `.jsx`) |
| Histórico de versões | `CHANGELOG.md` |
| Versão atual do prompt | **v4** (constante `PROMPT_VERSION` no `.jsx`) |

## Como funciona (v4)

**O LLM cita evidência e julga; o código extrai o que é regex, aplica regras duras, acopla critérios e valida.** Uma chamada ao modelo por caso.

```
Inputs separados: SOAP · E-mail · PDFs
   ↓
Código (pré):  regex no SOAP → peso, altura, IMC, campo "Próximos pontos", frases de alergia
   ↓
1 chamada LLM (structured output): fatos → por critério { evidência, score, justificativa }
   ↓
Código (pós):  regras duras + acoplamentos + verificação de evidência + total com denominador
   ↓
Painel com flags de revisão → "Copiar linha para a planilha"
```

### Regras aplicadas pelo código (não dependem do modelo)

| Regra | Efeito |
|---|---|
| Peso, altura ou IMC ausentes no SOAP | `3a = 0` |
| `2a = 0` (nenhum comportamento alimentar identificado) | `2b = NA`, `3a` passa a valer 19 pts |
| `2b = NA` sem `2a = 0` | contado como 0 + flag |
| Campo "Próximos pontos" ausente | `7a ≤ 50` |
| Comportamento não é a prioridade clínica | `A2 = NA` (nota máxima) |
| Tema do PDF não é a prioridade, ou nenhum PDF | `B2 = NA` (nota máxima) |
| Alérgeno documentado aparece no material **e** o modelo confirma contradição | `B2 = 0` (corte de segurança) |
| Só um dos dois sinais de alérgeno | flag vermelha, score intacto |
| Sem e-mail e sem PDF | Instrumento 2 **não é avaliado** (total sai de /60) |

Um fato (peso, altura, IMC, campo "Próximos pontos") conta como presente se o regex achou **ou** se o modelo o declarou presente com uma citação que o código localizou no SOAP.

### Verificação de evidência

Cada score vem com uma citação literal. O código normaliza (remove acentos, pontuação, espaços, caixa) e procura a citação **somente no documento permitido**: Instrumento 1 → SOAP; Instrumento 2 → e-mail + materiais. Resultado por critério:

- ✓ evidência localizada
- ⚠ evidência não localizada (possível invenção)
- ⚠ evidência fora do escopo (vazamento SOAP ↔ e-mail)

A verificação **nunca altera o score**; só gera flag para revisão humana.

### Semântica de NA (decisão 02/09/2026)

| Instrumento | NA |
|---|---|
| I1 · 1b | sai do denominador (I1 vale /54) |
| I1 · 2b | 5 pts migram para 3a (denominador continua 60) |
| I2 · A2, B2 | vale pontuação máxima (denominador fixo 40) |

## Como colar no claude.ai

1. Abra um chat no claude.ai e peça um artifact React, ou edite o artifact existente.
2. Substitua todo o código pelo conteúdo de `src/qa_nutricional.jsx`.
3. Confira no cabeçalho do artifact: `Prompt v4 · claude-opus-5 · effort medium`.

Constantes que podem precisar de ajuste, todas no topo do `.jsx`:

| Constante | Padrão | Quando mudar |
|---|---|---|
| `MODEL` | `claude-opus-5` | Se a latência via proxy passar de ~60 s por caso, `claude-sonnet-5` |
| `EFFORT` | `medium` | Subir para `high` se a calibração mostrar acordo baixo nos critérios de julgamento |
| `DECIMAL_SEP` | `,` | `.` se a planilha estiver em locale en-US |
| `PROMPT_VERSION` | `v4` | **Sempre** que qualquer texto de critério/regra mudar |

## Como usar (nutricionista avaliadora)

1. Nome do avaliador (fica salvo no navegador) e **código do caso** no formato `P01` / `A01`. Sem código válido a linha não é copiada, porque ele é a chave da planilha.
2. Tipo **1ª Consulta + Orient.**: cole o SOAP no primeiro campo, o e-mail no segundo, e suba os PDFs. Não misture SOAP e e-mail no mesmo campo.
3. **Avaliar caso**. Leia primeiro o bloco amarelo de flags e o painel "Fatos extraídos".
4. Abra os critérios com ⚠ para ver evidência e justificativa.
5. **Copiar linha para a planilha** → colar na aba da semana, a partir da coluna `timestamp`.

## Planilha e calibração

### Colunas novas na linha exportada (v4)

Ficam **depois** das três colunas manuais `com ferramenta corrigida (I1/I2/total)`, para não deslocar nada:

`prompt_version · model · effort · denominador_I1 · denominador_I2 · n_flags · flags`

Toda célula é sanitizada (sem tab nem quebra de linha) e os números saem com vírgula decimal.

### Aba "Calibração" (acordo humano × LLM por critério)

Pré-requisito confirmado: a planilha QA_Calibracao tem as notas humanas **por critério** com o código do caso.

1. Numa aba `Join`, traga para cada linha da QA Semanal a nota humana do mesmo caso e critério:

   ```
   =VLOOKUP($C2; QA_Calibracao!$A:$AZ; <coluna do critério>; FALSO)
   ```

   (coluna `C` = `caso`).

2. Numa aba `Calibração`, uma linha por critério e uma coluna por `prompt_version`. Para o critério `1a` na versão `v4`, com `L` = score do LLM, `H` = score humano, `V` = `prompt_version`:

   **Acordo exato (%)**
   ```
   =IFERROR(AVERAGE(ARRAYFORMULA(IF(FILTER(Join!L:L; Join!V:V="v4"; Join!L:L<>"")=FILTER(Join!H:H; Join!V:V="v4"; Join!L:L<>""); 1; 0))); "")
   ```

   **Viés médio (LLM − humano)** — positivo = LLM mais generoso; negativo = mais rígido. `NA` é ignorado.
   ```
   =IFERROR(AVERAGE(ARRAYFORMULA(IFERROR(VALUE(FILTER(Join!L:L; Join!V:V="v4"))-VALUE(FILTER(Join!H:H; Join!V:V="v4"))))); "")
   ```

3. Ordene por acordo crescente: os três piores critérios são os candidatos a reescrita na próxima versão do prompt. O sinal do viés diz se a regra está frouxa ou apertada.

### Golden set e promoção de versão

- Escolha 15-20 casos dos 57 já avaliados por humanos, cobrindo: um sem IMC, um com alergia contradita, um sem e-mail, um com `2a = 0`, e os critérios de pior acordo.
- A cada mudança de texto de critério: bump de `PROMPT_VERSION`, rode o golden set no artifact, compare a coluna nova com a anterior na aba Calibração **antes** de trocar o artifact em produção.
- Registre o resultado em `CHANGELOG.md`.
- Não use casos do golden set como exemplo dentro do prompt (contamina a medição).

## Decisões de produto registradas

| Data | Decisão |
|---|---|
| 02/09/2026 | Falta de peso/altura/IMC zera **só o 3a**, não o total. |
| 02/09/2026 | NA em 1b sai do denominador. |
| 02/09/2026 | Uma chamada ao modelo por caso; regras duras em código; sem verificador LLM. |
| 02/09/2026 | Calibração na própria planilha (fórmulas), sem script externo. |
| 02/09/2026 | Modelo inicial `claude-opus-5`, `effort: medium`; decisão final Opus × Sonnet por medição no golden set. |

## Dependências

- React + lucide-react (fornecidos pelo runtime do artifact).
- pdf.js 3.11.174 via cdnjs, carregado em runtime para extrair texto de PDF.
- Proxy do artifact para `api.anthropic.com/v1/messages` (sem chave no código). Se o proxy rejeitar `output_config`, o artifact repete a chamada sem ele e valida o JSON manualmente (a linha exportada leva a flag correspondente).
