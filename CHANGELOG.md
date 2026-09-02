# Changelog do prompt e do avaliador

Uma entrada por `PROMPT_VERSION`. Registre o acordo medido na aba Calibração assim que o golden set rodar.

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
