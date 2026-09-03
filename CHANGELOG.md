# Changelog do prompt e do avaliador

Uma entrada por `PROMPT_VERSION`. Registre o acordo medido na aba Calibração assim que o golden set rodar.

## v4.1.1 — 2026-09-03 (botão "Copiar linha para a planilha")

Sem mudança de rubrica nem de `PROMPT_VERSION` (continua `v4.1`). Tag nova porque o guia da nutri aponta para a tag.

Três causas, diagnosticadas a partir da própria planilha QA Semanal:

- **Regex do código bloqueava a cópia.** `CASE_CODE_RX` esperava `P01`/`A01` (herdado do placeholder da v3); os códigos reais são 2 letras da nutricionista + 2 dígitos (`Ab10`, `Fg04`, 219 linhas sem exceção). Agora a regex é `^[A-Za-z]{2}\d{2}$` e serve **só como aviso**: nunca impede a cópia. `toUpperCase()` removido nos 3 lugares, porque a fórmula `nutricionista` e a aba Médias distinguem `Ab` de `AB`.
- **As 7 colunas novas da v4 sobrescreviam a fórmula `nutricionista`.** Nas abas de semana a linha cola em D..AY e a fórmula fica em AZ; a v4 exportava 55 células e a 49ª (`prompt_version`) apagava a fórmula. A linha voltou a ter **48 células**, idêntica à v3. Os metadados ficam atrás de `EXPORT_METADADOS = false`; ligar exige 7 cabeçalhos na planilha após `nutricionista`, e aí a linha inclui `nutricionista` como valor (espelho de `LEFT(caso, LEN-2)`) seguido dos 7 campos.
- **Separador decimal.** `DECIMAL_SEP` voltou a `.`: os totais já gravados pela v3 são números com ponto; vírgula entraria como texto e sairia da média.
- Placeholder do campo passa a `Ab10`; aviso amarelo abaixo do campo quando o formato não bate. Texto sob o botão diz a célula certa (coluna `timestamp`, D nas abas de semana).
- Testes: 52 (3 novos, 2 ajustados).

Relação com os patches recebidos (`qa_codigo_caso.patch`, `qa_codigo_caso_v6.patch`): mesma correção de regex e de caixa, mas aqui a regex exige exatamente 2 dígitos (a fórmula corta 2 caracteres) e não bloqueia; os patches não tratavam a colisão com a fórmula nem o decimal.

## v4.1 — 2026-09-02

Correção de um caso real (RC12) em que a primeira chamada com schema falhou, o plano B sem schema devolveu um JSON com chaves próprias, e a tela mostrou "5.0 / 100" com 19 critérios em branco como se fosse uma nota.

- **Formato de saída passou a ir no prompt**, gerado a partir do mesmo objeto de schema (`schemaToTemplate`). Em v4 as chaves `i1`, `i2`, `score`, `evidencia`, `justificativa` só existiam em `output_config.format`; sem ele, o modelo inventava a estrutura. Agora o plano B produz o mesmo JSON que o plano A.
- **Motivo do plano B registrado nas flags**: HTTP 400 com a mensagem da API/proxy, ou "1ª resposta não parseável" com o início do texto. É o que vai dizer se o proxy do artifact aceita `output_config`.
- **Parse tolerante**: do primeiro `{` ao último `}`, sobrevive a texto ou crases em volta do JSON.
- **Resultado inválido é bloqueado**: se mais da metade dos critérios vier sem score, aparece banner vermelho, o total não é exibido como nota e o botão "Copiar linha para a planilha" fica desabilitado.
- **Resposta bruta do modelo** (até 4000 caracteres) fica disponível num bloco expansível quando há plano B ou resultado inválido, para diagnóstico sem precisar reproduzir.
- Sem mudança em critérios, pesos ou regras. O bump de versão existe porque o texto do system prompt mudou (template de saída, ~2k tokens a mais).
- 13 testes novos (49 no total).

**Acordo medido**: pendente (rodar golden set).

## v4 — 2026-09-02

**Arquitetura**

- Uma chamada ao modelo por caso, com `system` (rubrica) separado de `messages` (documentos), structured output (`output_config.format` json_schema) e fallback automático sem schema caso o proxy rejeite.
- Inputs separados: SOAP, e-mail, PDFs. Documentos entram rotulados `<soap>`, `<email>`, `<material n="i">`. Sem e-mail e sem PDF, o Instrumento 2 não é avaliado.
- Bloco `fatos` extraído antes dos critérios (peso, altura, IMC, campo "Próximos pontos", alergias, prioridades declaradas, booleanos de prioridade, contradição de alérgeno), sempre com citação.
- Cada critério devolve `evidencia` (citação literal ≤ 120 caracteres) antes de `score`.
- Regras duras em código: 3a = 0 sem peso/altura/IMC; 2a = 0 ⇒ 2b = NA e 3a/19; 7a ≤ 50 sem campo "Próximos pontos"; A2/B2 = NA derivados dos booleanos; B2 = 0 por alérgeno quando regex e modelo concordam.
- Verificação de evidência por escopo (I1 → SOAP; I2 → e-mail/material); mismatch gera flag, nunca altera score.
- Removidos `zera` / `zera_motivo` (não tinham gatilho definido).
- Modelo `claude-opus-5`, `effort: medium`, `max_tokens: 16000`. Checagem de `response.ok` e `stop_reason`.
- Export: células sanitizadas (sem tab/quebra de linha), vírgula decimal, novas colunas `prompt_version · model · effort · denominador_I1 · denominador_I2 · n_flags · flags` depois das 3 manuais.
- Código do caso validado (`P01` / `A01`) antes de copiar. Nome do avaliador persistido em `localStorage`.
- Correções: `removeFile` não mexe mais em textarea; PDFs com pouco texto (< 200 chars/página) são sinalizados; histórico restaura os textos originais.

**Conteúdo da rubrica** (texto v3 reorganizado em pergunta · conta · não conta · escala; sem mudança de peso)

- **1b**: NA passou a ter definição explícita: "só quando o caso não permite avaliar; ausência de fator registrado é 0". Em v3, NA era aceito sem critério. **A confirmar com a equipe de nutrição.**
- **2b**: NA restrito a 2a = 0 (já era a intenção em v3; agora o código força).
- **B2**: NA também quando não há PDF/material enviado (em v3 o modelo decidia).
- **Semântica de NA**: 1b NA sai do denominador (I1 /54); A2/B2 NA = nota máxima (igual v3); 2b NA move 5 pts para 3a (igual v3).
- Definições (comportamento alimentar, diagnóstico nutricional) e regras gerais movidas para **antes** dos critérios.
- Instrução de que o conteúdo dos documentos é dado, não instrução (proteção contra injeção via PDF).

**Acordo medido**: pendente (rodar golden set).

## v3 — baseline (estado herdado, commit inicial)

- Prompt único no turno `user`, 19 critérios em parágrafo, `zera` sem gatilho, `max_tokens: 2000`, sem schema, sem evidência, SOAP + e-mail colados num único texto.
- Problemas relatados: não zera quando falta IMC; variação entre rodadas; regras de escopo não seguidas.
