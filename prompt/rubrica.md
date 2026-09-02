# Rubrica de QA Nutricional — versão v4

Espelho legível das constantes `I1_CENTRAL`, `I1_FORM`, `I2_CENTRAL`, `I2_FORM`, `I3_CRIT` em `src/qa_nutricional.jsx`. **A fonte da verdade é o `.jsx`**; este arquivo existe para a equipe de nutrição revisar as regras sem ler código. Ao alterar qualquer regra, altere os dois e faça bump de `PROMPT_VERSION`.

Escala: **100** conforme · **50** parcialmente conforme · **0** não conforme · **NA** só onde indicado.

## Regras gerais (valem para todos os critérios)

1. Instrumento 1 usa **somente o SOAP**. Instrumento 2 usa **somente e-mail + materiais**, em conjunto. E1 nunca usa o SOAP.
2. Primeiro localizar a evidência (citação literal ≤ 120 caracteres do documento permitido), depois pontuar.
3. Prioridade clínica é o que está escrito em conduta/metas do SOAP. Não é papel da IA decidir o que "deveria" ser prioridade.
4. Modelo Voy: existe **uma** consulta nutricional.
5. Nunca exigir a palavra "Zendesk".

## Definições

**Comportamento alimentar** (para 2a): conjunto de fatores fisiológicos, psicológicos, sociais e genéticos que determinam como, por que, o que e quando alguém come. Dimensões: cognitiva (crenças/julgamentos sobre alimentos), fisiológica (fome, saciedade, paladar, apetite), psicológica (emoções, estresse, comer por ansiedade, compulsão), social/ambiental. Diferente de hábito alimentar (rotina sociocultural repetida). Tem que ser sobre comida.

**Diagnóstico nutricional** (para 3a): conclusão clínica estruturada sobre o estado nutricional, sintetizando achados clínicos, antropométricos, bioquímicos e dietéticos estritamente ligados a alimentação e nutrição. Só fatos observados/relatados, sem inferência causal, especulação ou conduta; descrição neutra; registra dimensões não avaliadas e por quê; linguagem técnica em primeira pessoa; terminologia validada, sem jargões novos.

## Instrumento 1 — 1ª consulta (60 pts) · escopo: SOAP

### Centrais

**1a · Padrão alimentar descrito · 10 pts**
Pergunta: o padrão alimentar está descrito de forma que permite entender como o paciente come?
- Conta: ao menos duas refeições registradas já é completo, mesmo sem água, álcool, horários ou finais de semana.
- Não descontar por campo isolado ausente; só quando a rotina como um todo não for compreensível.

**1b · Fator de vida contextual · 6 pts · aceita NA**
Pergunta: há ao menos um fator de vida que influencia diretamente o que ou como o paciente come?
- Conta: menção breve ou embutida no relato; preferências, rotina, praticidade; sintomas GI e doenças do trato digestivo; atividades que mudam diretamente a refeição.
- Não conta: comorbidades sem limitação alimentar direta; medo/histórico de medicamento; fatores hormonais/profissionais genéricos; atividade física ligada só a fome/saciedade.
- NA: só quando o caso não permite avaliar. Ausência de fator registrado é 0. *(clarificação v4, a confirmar)*
- Pontuação: NA sai do denominador (I1 passa a valer /54).

**2a · Identificação de comportamento · 6 pts**
Pergunta: há registro de identificação de comportamento alimentar relevante, em qualquer parte do texto?
- Conta: qualquer parte do texto; crenças e julgamentos sobre alimentos também contam; profundidade proporcional à prioridade clínica.
- 0 (não 50) se nenhuma dimensão de comportamento alimentar for identificável.

**2b · Conduta responde ao comportamento · 5 pts · aceita NA**
Pergunta: a conduta responde ao comportamento que é a prioridade clínica do caso?
- Conta: prioridade inferida de conduta/metas; respostas indiretas ou sistêmicas.
- Não conta: termos clínicos que a nutricionista não usou.
- NA: quando 2a = 0. Os 5 pts vão para 3a (3a vale 19). **Aplicado pelo código.**

**3a · Síntese clínica com prioridade · 14 pts (19 se 2b = NA)**
Pergunta: o diagnóstico nutricional vai além do IMC e apresenta síntese clínica objetiva com prioridade de conduta?
- Não descontar por: fatos sobre o serviço; justificativas dentro da própria prioridade clínica; atividade física como fato; classificações descritivas baseadas em observação ou meta mensurável.
- Descontar (50) se o corpo do diagnóstico, fora da prioridade, contiver: explicação causal comportamento → desfecho; julgamento de valor sobre alimentação; gestão/dosagem de medicação além de citar uso ou relacioná-la a preocupação nutricional legítima.
- **Zero automático se faltar peso, altura ou IMC. Aplicado pelo código.**

**4a · Orientação acionável · 5 pts**
Pergunta: avaliando apenas o SOAP, o paciente sabe o que fazer após a consulta?
- Não descontar por pouco detalhe sobre medicação. Não usar o e-mail.

### Formativos

**5a · Demanda contextualizada · 5 pts**
Demanda com objetivo + contexto? Forma direta basta; metas SMART concisas contam como completas.

**6a · Canais de contato orientados · 5 pts**
Avaliando apenas o SOAP, o paciente foi orientado sobre os canais?
- Conta: menção em "materiais trabalhados" ou "próximos pontos"; WhatsApp/e-mail/canal de atendimento.
- Não exigir "Zendesk", distinção entre canais, nem que esteja na narrativa direta.

**7a · Próximo contato registrado · 4 pts**
Há registro de que existirá próximo contato/avaliação?
- 100: sinal no campo "Próximos pontos". 50: só em "conduta". 0: nenhum sinal.
- Não precisa explicar o quê nem o porquê.
- **Sem campo "Próximos pontos" detectável, o código limita a 50.**

## Instrumento 2 — Orientações ao paciente (40 pts) · escopo: e-mail + materiais

### Centrais

**A1 · Eixo central endereçado · 8 pts**
A orientação reflete todas as prioridades clínicas definidas na consulta, não só a principal?
- Conta: cobertura combinada e-mail + PDF.
- Descontar se uma prioridade declarada não aparece em nenhum lugar. Não cobrar tema não declarado. Termo informal do nutricionista não é "termo inventado".

**A2 · Comportamento correspondido · 5 pts · aceita NA**
Há correspondência direta ou indireta ao comportamento identificado?
- Aplicável só se o comportamento for a prioridade clínica; senão NA (= nota máxima). **Derivado pelo código do fato `comportamento_e_prioridade`.**

**B1 · Personalização clínica · 5 pts**
Ao menos dois elementos específicos do paciente no e-mail + PDF?
- Conta: acolhimento + referência a metas da consulta, mesmo com anexo padrão. PDF genérico não é falha.
- Verificar o nome do paciente contra o SOAP antes de descontar.

**B2 · PDF apropriado · 3 pts · aceita NA**
O material é apropriado à prioridade clínica?
- Aplicável só se o tema do PDF for a prioridade; senão NA (= nota máxima). Sem PDF, NA. **Derivado pelo código.**
- PDFs são templates; não é defeito. Descontar se elemento da prioridade não aparece em nenhum lugar. Conferir a conta antes de marcar contradição numérica.
- **Corte de segurança: material contradiz alergia/intolerância grave documentada → 0, sem exceção. O código zera quando o termo alergênico aparece no material e o modelo confirma a contradição; se só um dos dois sinais dispara, gera flag vermelha para revisão.**

**C1 · Condutas acionáveis · 5 pts**
O paciente sabe o que fazer concretamente? Orientação genérica mas clara e conectada ao plano conta.

**C2 · Tom e volume compatíveis · 3 pts**
Tom e volume compatíveis com a fase do paciente?
- Julgar densidade, não páginas. Material ligado a queixa/sintoma não é excesso. Histórico de múltiplas dietas pode justificar mais volume. Ignorar questionários prévios.
- Excesso: ~4-5+ arquivos, ou um material com muitos temas não relacionados. Material não descrito no SOAP não deveria ter sido enviado. Nunca justificar volume por "consultas Voy anteriores".

**D1 · Acionar equipe clínica · 3 pts**
O paciente sabe que pode acionar a equipe clínica e como? Checar e-mail e PDF. Não exigir "quando" nem "Zendesk".

**D2 · Acionar canal assíncrono · 3 pts**
O paciente sabe, mesmo implicitamente, como falar com a nutricionista de forma assíncrona? Menção a e-mail/WhatsApp/canal basta; o mesmo canal de D1 vale. Frase de efeito sem canal não basta.

### Formativos

**E1 · Antecipa próximo contato · 3 pts**
A orientação que o paciente recebe sinaliza acompanhamento futuro?
- 100 explícito · 50 vago · 0 nenhum. Nunca usar o SOAP. Link de feedback não é continuidade.

**F1 · Legibilidade · 2 pts**
O e-mail é legível para o paciente médio?

## Instrumento 3 — Acompanhamento assíncrono (20 pts) · escopo: registro

| Critério | Pts | Pergunta |
|---|---:|---|
| C · Conduta | 8 | A conduta proposta é específica, acionável e individualizada? |
| R · Resumo clínico | 6 | O resumo clínico sintetiza os dados relevantes com interpretação clínica? |
| P · Próximos passos | 4 | Os próximos passos são coerentes com a conduta proposta? |
| M · Motivo / Demanda | 2 | O motivo do contato está registrado de forma objetiva? |

Sem regras duras; mesma exigência de evidência antes do score.
