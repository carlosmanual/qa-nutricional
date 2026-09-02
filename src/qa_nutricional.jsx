import { useState, useRef, useEffect } from "react";
import { ClipboardCopy, ChevronDown, ChevronUp, Loader2, FileText, History, Trash2, Upload, X, FileCheck } from "lucide-react";

const DARK = "#2E4057";
const TEAL = "#1A6B72";
const RED = "#A32D2D";
const RED_BG = "#FADBD8";
const BLUE = "#185FA5";
const BLUE_BG = "#D6EAF8";
const GREEN = "#1E8449";
const GREEN_BG = "#E8F8F5";
const AMBER = "#7D6608";
const AMBER_BG = "#FCF3CF";
const GRAY_L = "#F5F5F5";
const BORDER = "#E2E5E9";

// Sem gravação automática — o fluxo é manual: avaliar aqui, copiar a linha (botão abaixo)
// e colar na aba da semana certa da planilha "QA Semanal", começando na coluna "timestamp"
// (ver aba "Leia-me" da planilha). Isso preserva as colunas manuais (Caso, link_nota,
// link_email_zendesk) e a fórmula da coluna "nutricionista", que não fazem parte do export.
const SHEET_HEADERS = [
  "timestamp", "avaliador", "caso", "tipo",
  "I1_1a_score", "I1_1a_justificativa", "I1_1b_score", "I1_1b_justificativa",
  "I1_2a_score", "I1_2a_justificativa", "I1_2b_score", "I1_2b_justificativa",
  "I1_3a_score", "I1_3a_justificativa", "I1_4a_score", "I1_4a_justificativa",
  "I1_5a_score", "I1_5a_justificativa", "I1_6a_score", "I1_6a_justificativa",
  "I1_7a_score", "I1_7a_justificativa",
  "I2_A1_score", "I2_A1_justificativa", "I2_A2_score", "I2_A2_justificativa",
  "I2_B1_score", "I2_B1_justificativa", "I2_B2_score", "I2_B2_justificativa",
  "I2_C1_score", "I2_C1_justificativa", "I2_C2_score", "I2_C2_justificativa",
  "I2_D1_score", "I2_D1_justificativa", "I2_D2_score", "I2_D2_justificativa",
  "I2_E1_score", "I2_E1_justificativa", "I2_F1_score", "I2_F1_justificativa",
  "I1_total", "I2_total", "total",
  // As três colunas abaixo ficam em branco de propósito — são preenchidas à mão
  // depois de reavaliar o caso com a ferramenta corrigida, pra comparar com o total original.
  "com ferramenta corrigida (I1)", "com ferramenta corrigida (I2)", "com ferramenta corrigida (total)",
];

// ── Critérios — pesos confirmados na planilha QA_Calibracao; perguntas revisadas v3 (correções do lote de 57 casos, formato longo) ──
const I1_CENTRAL = [
  { k: "1a", label: "Padrão alimentar descrito", pergunta: "O padrão alimentar está descrito de forma que permite entender como o paciente come? Considere completo se houver AO MENOS DUAS REFEIÇÕES registradas, mesmo sem água/álcool/horários/finais de semana preenchidos. Só descontar quando a ROTINA COMO UM TODO não for compreensível — nunca por causa de um campo isolado ausente.", pts: 10 },
  { k: "1b", label: "Fator de vida contextual", pergunta: "Há ao menos um fator de vida que influencia DIRETAMENTE o que ou como o paciente come — mesmo que breve (consulta é de ~20 min) ou embutido no relato, sem precisar de seção dedicada? Só contam fatores com ligação DIRETA à alimentação: preferências pessoais, rotina, praticidade, sintomas gastrointestinais, doenças do trato digestivo, ou atividades que mudam diretamente a refeição (ex: dieta diferente em dia de treino). NÃO contam: comorbidades sem limitação alimentar direta (hipertensão, enxaqueca, artrite), medo/histórico de medicamento, fatores hormonais/profissionais genéricos, ou atividade física ligada só a fome/saciedade (não ao padrão alimentar em si).", pts: 6, na: true },
  { k: "2a", label: "Identificação de comportamento", pergunta: "Há registro de identificação de COMPORTAMENTO ALIMENTAR relevante (ver definição de comportamento alimentar nas regras especiais), em qualquer parte do texto (não precisa ter tópico dedicado)? Não se restrinja a beliscar/comer emocional/compulsão — crenças e julgamentos sobre alimentos (dimensão cognitiva) também contam. Profundidade esperada é proporcional à prioridade clínica do caso. Se NENHUMA dimensão de comportamento alimentar for identificável no texto (ex: só há atividade física ou só condição clínica, nada sobre comida), a nota é 0 — não 50.", pts: 6 },
  { k: "2b", label: "Conduta responde ao comportamento", pergunta: "A conduta responde ao comportamento que for a PRIORIDADE CLÍNICA do caso (infira a partir do que está escrito em conduta/metas — não decida a prioridade por conta própria)? Respostas indiretas ou sistêmicas contam (ex: reorganizar a rotina resolve o comportamento sem nomeá-lo). Não use termos clínicos que a nutricionista não usou.", pts: 5, na: true, naNote: "N/A redistribui 5pts ao 3a" },
  { k: "3a", label: "Síntese clínica com prioridade", pergunta: "O diagnóstico nutricional vai além do IMC e apresenta síntese clínica objetiva com prioridade de conduta (ver definição nas regras especiais)? ZERO AUTOMÁTICO se faltar peso, altura ou IMC. Descontar (não dar 100) apenas se o corpo do diagnóstico (fora da prioridade clínica) contiver: (1) explicação causal entre comportamento e desfecho; (2) julgamento de valor sobre alimentação (não inclui julgamentos sobre comportamentos não alimentares, como adesão ao exercício); ou (3) gestão/dosagem de medicação além de citar seu uso ou relacioná-la a uma preocupação nutricional legítima. Não descontar por: fatos sobre o serviço (ex.: previsão de início de tratamento), justificativas dentro da própria prioridade clínica (explicação causal), atividade física descrita apenas como fato, ou classificações descritivas baseadas em observação ou meta mensurável (ex.: hidratação adequada, padrão alimentar desorganizado, boa adesão, etc).", pts: 14 },
  { k: "4a", label: "Orientação acionável", pergunta: "Avaliando APENAS o texto do registro da consulta (SOAP) — NÃO o e-mail/orientação, que é avaliado à parte no Instrumento 2 — o paciente sabe o que fazer após a consulta? Não descontar por pouco detalhe sobre medicação (limite regulatório do nutricionista).", pts: 5 },
];
const I1_FORM = [
  { k: "5a", label: "Demanda contextualizada", pergunta: "Demanda descrita com objetivo + contexto, ainda que de forma objetiva/direta (metas SMART concisas contam como completas)?", pts: 5 },
  { k: "6a", label: "Canais de contato orientados", pergunta: "Avaliando APENAS o registro da consulta (não o e-mail/orientação): o paciente foi orientado sobre como usar os canais disponíveis? Conta como 100 mesmo que a menção esteja em 'materiais trabalhados' (ex: envio de material sobre canais) ou em 'próximos pontos' — não precisa estar na narrativa direta da consulta. NÃO exigir a palavra 'Zendesk' (o paciente não deve precisar saber o nome da plataforma — WhatsApp/e-mail/canal de atendimento bastam) nem distinção explícita entre canais.", pts: 5 },
  { k: "7a", label: "Próximo contato registrado", pergunta: "Há registro de que existirá próximo contato/avaliação (não precisa explicar o quê ou o porquê)? Nota 100 exige o sinal especificamente no campo 'PRÓXIMOS PONTOS'. Se o sinal de continuidade existe só no campo 'conduta' (não em próximos pontos), nota 50. Se não há nem o campo 'próximos pontos' nem qualquer ideia de continuidade em nenhum lugar do texto, nota 0.", pts: 4 },
];

const I2_CENTRAL = [
  { k: "A1", label: "Eixo central endereçado", pergunta: "A orientação (e-mail + PDF, em conjunto) reflete TODAS as prioridades clínicas que o nutricionista definiu na consulta — não só a principal? Se uma prioridade declarada (ex: hidratação, exercício de força, monitorar sintomas GI) não aparece em NENHUM lugar do material, descontar, mesmo que as outras estejam bem cobertas. Conteúdo pode estar no e-mail OU no PDF — cobertura combinada conta. NÃO cobrar de um tema que o nutricionista não declarou como prioridade. Se o nutricionista usa termo informal (ex: 'ansiedade alimentar') na própria prioridade clínica, não sinalizar como termo inventado — é do nutricionista, não da IA.", pts: 8 },
  { k: "A2", label: "Comportamento correspondido", pergunta: "Aplicável apenas se o comportamento identificado for a prioridade clínica estabelecida em 3a. Havendo prioridade: há correspondência direta OU indireta (ex: reorganizar a rotina via plano alimentar resolve o comportamento sem nomeá-lo) na orientação? Se o comportamento NÃO foi declarado prioridade clínica, marcar NA — NA aqui conta como nota máxima (100%), não é penalização.", pts: 5, na: true },
  { k: "B1", label: "Personalização clínica", pergunta: "O e-mail + PDF, em conjunto, contêm ao menos dois elementos específicos do paciente? Antes de descontar por 'erro no nome do paciente', VERIFIQUE o nome contra o texto original — não presuma erro sem checar. PDF template genérico não é falha por si (isso é esperado no modelo Voy). E-mail com tom de acolhimento + referência a metas definidas em consulta já conta como personalização suficiente, mesmo com anexo 100% padrão.", pts: 5 },
  { k: "B2", label: "PDF apropriado", pergunta: "Aplicável apenas se a condição/comportamento do PDF for a prioridade clínica estabelecida (caso contrário, NA — NA conta como nota máxima, não penalização). PDFs são templates padrão — isso não é defeito. ZERO AUTOMÁTICO (corte de segurança, não proporcional) se o material contradiz alergia ou intolerância grave documentada (ex: sugerir receita com alimento ao qual o paciente é alérgico) — alimento alergênico deve ser completamente excluído do material, sem exceção. Também descontar se um elemento da prioridade clínica declarada (ex: hidratação como meta no SOAP) não aparece em NENHUM lugar do material, mesmo com o resto bem coberto. Antes de marcar contradição numérica, confira a conta: uma orientação de 'reduzir para X' quando o paciente consome mais que X é ALINHADA, não contraditória.", pts: 3, na: true },
  { k: "C1", label: "Condutas acionáveis", pergunta: "As condutas são descritas de forma que o paciente sabe o que fazer concretamente? Orientação genérica mas clara e conectada ao plano também conta como acionável.", pts: 5 },
  { k: "C2", label: "Tom e volume compatíveis", pergunta: "O tom e o volume de informações são compatíveis com a fase do paciente? Não julgue pela quantidade de páginas, mas pela densidade e abrangência do conteúdo. O modelo Voy possui apenas UMA consulta nutricional, portanto nunca considere 'consultas Voy anteriores' como justificativa para maior volume, mesmo que o nutricionista tenha avisado no SOAP que enviaria os materiais. Descontar quando houver excesso de informações, caracterizado por: (1) cerca de 4–5 ou mais arquivos separados; ou (2) um único material abordando muitos temas não relacionados entre si (ex.: jantar, finais de semana, restaurantes, lanches, receitas, checklist, mindful eating e conteúdo institucional). Materiais diretamente relacionados a uma queixa ou sintoma do paciente (ex.: PDF sobre constipação para paciente com intestino preso) não contam como excesso, mesmo sendo um arquivo adicional. Considere também que um histórico de vida com múltiplas tentativas de dieta pode justificar um volume um pouco maior. Se determinado material não estiver descrito no SOAP, considere que ele não deveria ter sido enviado. Ignore fatores irrelevantes ao volume, como o preenchimento de questionários prévios.", pts: 3 },
  { k: "D1", label: "Acionar equipe clínica", pergunta: "O paciente sabe que pode acionar a equipe clínica e como (canal)? NÃO exigir 'quando'/gatilhos específicos, nem menção literal a 'Zendesk'. Checar e-mail E PDF/materiais antes de descontar.", pts: 3 },
  { k: "D2", label: "Acionar canal assíncrono", pergunta: "O paciente sabe, mesmo implicitamente (ex: 'responda este e-mail'), como falar com a nutricionista de forma assíncrona? Frase de efeito sem indicação de canal (ex: 'conte comigo sempre que precisar') NÃO basta — precisa haver menção explícita ou implícita a e-mail/WhatsApp/canal assíncrono especificamente. O mesmo canal usado em D1 é válido aqui também — não são obrigatoriamente distintos. NÃO exigir 'quando' nem 'Zendesk'.", pts: 3 },
];
const I2_FORM = [
  { k: "E1", label: "Antecipa próximo contato", pergunta: "A orientação que o PACIENTE RECEBE (e-mail/PDF) sinaliza que haverá algum tipo de acompanhamento futuro (contato, questionário, mensagens)? NUNCA considerar o que está escrito no SOAP para este critério — o SOAP é registro interno, não o que o paciente vê. Link de feedback pós-consulta NÃO é sinal de continuidade. NÃO exigir que especifique o que será avaliado ou o porquê clínico. Linguagem explícita de acompanhamento = 100; menção vaga/implícita = 50; nenhuma menção = 0.", pts: 3 },
  { k: "F1", label: "Legibilidade", pergunta: "O e-mail é legível para o paciente médio?", pts: 2 },
];

const I3_CRIT = [
  { k: "C", label: "Conduta", pergunta: "A conduta proposta é específica, acionável e individualizada?", pts: 8 },
  { k: "R", label: "Resumo clínico", pergunta: "O resumo clínico sintetiza os dados relevantes com interpretação clínica?", pts: 6 },
  { k: "P", label: "Próximos passos", pergunta: "Os próximos passos são coerentes com a conduta proposta?", pts: 4 },
  { k: "M", label: "Motivo / Demanda", pergunta: "O motivo do contato está registrado de forma objetiva?", pts: 2 },
];

function buildPrompt(caseType, caseText) {
  if (caseType === "P") {
    return `Você é um avaliador clínico especialista em QA para nutrição (tratamento de obesidade com GLP-1) na Voy. Avalie o caso abaixo usando EXATAMENTE os critérios e pesos a seguir. Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois.

INSTRUMENTO 1 — 1ª CONSULTA (60 pts)
Critérios centrais:
${I1_CENTRAL.map(c => `- ${c.k} (${c.pts}pt): ${c.pergunta}${c.na ? " [aceita N/A]" : ""}`).join("\n")}
Critérios formativos:
${I1_FORM.map(c => `- ${c.k} (${c.pts}pt): ${c.pergunta}`).join("\n")}
Regras especiais do Instrumento 1:
- Escopo: avalie SOMENTE o texto do registro da consulta (SOAP). NÃO use o conteúdo do e-mail/orientação para pontuar nenhum critério deste instrumento, mesmo que ele esteja colado junto no texto do caso — isso é avaliado separadamente no Instrumento 2.
- Prioridade clínica: infira a prioridade a partir do que está escrito em conduta/metas. Não é papel da IA decidir por conta própria o que "deveria" ser prioridade.
- Se 2b = N/A (nenhum comportamento identificado em 2a), os 5 pts de 2b são somados ao critério 3a (3a passa a valer até 19 pts neste caso).
- Definição de comportamento alimentar (usar para julgar 2a): conjunto de fatores fisiológicos, psicológicos, sociais e genéticos que determinam como, por que, o que e quando alguém come. Dimensões: cognitiva (crenças/julgamentos sobre alimentos, ex: rotular comida como "boa"/"ruim"), fisiológica (fome, saciedade, paladar, apetite), psicológica (emoções, estresse, comer por ansiedade, compulsão), social/ambiental (normas culturais, contexto de quem está por perto). Diferença de hábito alimentar: comportamento é resposta a estímulos/sinais; hábito é rotina sociocultural repetida (ex: estrutura de 3 refeições + 2 lanches). Comportamento tem que ser sobre COMIDA — atividade física, doença ou outros fatores sem ligação direta com o ato de comer não contam.
- Definição de diagnóstico nutricional (usar para julgar 3a): conclusão clínica estruturada sobre o estado nutricional do paciente, sintetizando achados das dimensões clínica, antropométrica, bioquímica e dietética ESTRITAMENTE relacionados à alimentação e nutrição. Deve: apresentar apenas fatos observados/relatados, sem inferência causal, especulação ou proposição de conduta; descrever práticas de forma neutra, sem qualificar como boa/ruim; restringir-se a achados com conexão direta com nutrição (condição clínica só entra se houver dado nutricional concreto associado); registrar explicitamente quando uma dimensão não pôde ser avaliada e por quê; usar linguagem técnica em primeira pessoa; usar terminologia validada (ex: "comer emocional", classificação de obesidade conforme OMS), sem criar jargões.

INSTRUMENTO 2 — ORIENTAÇÕES AO PACIENTE (40 pts)
Critérios centrais:
${I2_CENTRAL.map(c => `- ${c.k} (${c.pts}pt): ${c.pergunta}${c.na ? " [aceita N/A]" : ""}`).join("\n")}
Critérios formativos:
${I2_FORM.map(c => `- ${c.k} (${c.pts}pt): ${c.pergunta}`).join("\n")}
Regras especiais do Instrumento 2:
- Escopo: avalie o e-mail + PDF/materiais de orientação, em conjunto, como um único pacote (não pontue um em detrimento do outro).
- A2 e B2 só se aplicam quando o comportamento/condição correspondente for a prioridade clínica estabelecida em 3a; caso contrário, marcar "NA". IMPORTANTE: "NA" em A2/B2 NÃO é penalização — equivale a nota máxima (100%) desse critério, porque não há base para descontar algo que não foi definido como prioridade.
- D1 e D2 podem ser satisfeitos pela mesma menção de canal — não exigir dois canais distintos.
- Nunca exigir a palavra "Zendesk" como critério de aprovação.
- 🔴 CORTE DE SEGURANÇA em B2: se o material (e-mail ou PDF) contradiz uma alergia ou intolerância alimentar grave documentada no SOAP (ex: sugere receita com o alimento ao qual o paciente é alérgico), B2 = 0 automaticamente, sem exceção — isso é regra de segurança clínica, não uma questão de calibração de template.
- E1 nunca deve usar o conteúdo do SOAP como evidência — apenas o que está no e-mail/PDF que o paciente recebe.

Escala para cada critério: "100" (conforme), "50" (parcialmente conforme), "0" (não conforme), ou "NA" quando aplicável (em A2/B2, "NA" = comportamento/condição não é prioridade clínica declarada — conta como nota máxima, não como penalização).

CASO A AVALIAR:
"""
${caseText}
"""

Responda apenas com este JSON (preencha score como "100"/"50"/"0"/"NA" e justificativa em 1 frase curta por critério):
{
  "i1": { "1a": {"score":"","justificativa":""}, "1b": {"score":"","justificativa":""}, "2a": {"score":"","justificativa":""}, "2b": {"score":"","justificativa":""}, "3a": {"score":"","justificativa":""}, "4a": {"score":"","justificativa":""}, "5a": {"score":"","justificativa":""}, "6a": {"score":"","justificativa":""}, "7a": {"score":"","justificativa":""} },
  "i2": { "A1": {"score":"","justificativa":""}, "A2": {"score":"","justificativa":""}, "B1": {"score":"","justificativa":""}, "B2": {"score":"","justificativa":""}, "C1": {"score":"","justificativa":""}, "C2": {"score":"","justificativa":""}, "D1": {"score":"","justificativa":""}, "D2": {"score":"","justificativa":""}, "E1": {"score":"","justificativa":""}, "F1": {"score":"","justificativa":""} },
  "zera": false,
  "zera_motivo": ""
}`;
  } else {
    return `Você é um avaliador clínico especialista em QA para nutrição (tratamento de obesidade com GLP-1) na Voy. Avalie o caso assíncrono abaixo usando EXATAMENTE os critérios e pesos a seguir. Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois.

INSTRUMENTO 3 — ACOMPANHAMENTO ASSÍNCRONO (20 pts)
${I3_CRIT.map(c => `- ${c.k} (${c.pts}pt): ${c.pergunta}`).join("\n")}

Escala para cada critério: "100" (conforme), "50" (parcialmente conforme), "0" (não conforme).

CASO A AVALIAR:
"""
${caseText}
"""

Responda apenas com este JSON:
{
  "i3": { "C": {"score":"","justificativa":""}, "R": {"score":"","justificativa":""}, "P": {"score":"","justificativa":""}, "M": {"score":"","justificativa":""} },
  "zera": false,
  "zera_motivo": ""
}`;
  }
}

function calcI1(scores) {
  if (!scores) return { central: 0, form: 0, total: 0 };
  const val = (k, pts) => {
    const s = scores[k]?.score;
    if (s === "100") return pts;
    if (s === "50") return pts / 2;
    return 0;
  };
  const is2bNA = scores["2b"]?.score === "NA";
  let central = 0;
  for (const c of I1_CENTRAL) {
    if (c.k === "2b") {
      if (!is2bNA) central += val("2b", 5);
      continue;
    }
    if (c.k === "3a") {
      const pts3a = is2bNA ? 19 : 14;
      central += val("3a", pts3a);
      continue;
    }
    if (c.k === "1b" && scores["1b"]?.score === "NA") continue;
    central += val(c.k, c.pts);
  }
  let form = 0;
  for (const c of I1_FORM) form += val(c.k, c.pts);
  return { central, form, total: central + form };
}

function calcI2(scores) {
  if (!scores) return { central: 0, form: 0, total: 0 };
  const val = (k, pts) => {
    const s = scores[k]?.score;
    // NA em A2/B2 significa "comportamento/condição não é prioridade clínica" —
    // não há base para descontar, então conta como nota máxima (corrigido v3;
    // antes contava como 0, penalizando indevidamente casos sem prioridade declarada).
    if (s === "NA") return pts;
    if (s === "100") return pts;
    if (s === "50") return pts / 2;
    return 0;
  };
  let central = 0;
  for (const c of I2_CENTRAL) central += val(c.k, c.pts);
  let form = 0;
  for (const c of I2_FORM) form += val(c.k, c.pts);
  return { central, form, total: central + form };
}

function calcI3(scores) {
  if (!scores) return { total: 0 };
  const val = (k, pts) => {
    const s = scores[k]?.score;
    if (s === "100") return pts;
    if (s === "50") return pts / 2;
    return 0;
  };
  let total = 0;
  for (const c of I3_CRIT) total += val(c.k, c.pts);
  return { total };
}

let pdfjsLoadPromise = null;
function loadPdfJs() {
  if (pdfjsLoadPromise) return pdfjsLoadPromise;
  pdfjsLoadPromise = new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Falha ao carregar leitor de PDF."));
    document.head.appendChild(script);
  });
  return pdfjsLoadPromise;
}

async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  return fullText.trim();
}

function ScoreChip({ score }) {
  if (score === "100") return <span style={{ background: GREEN_BG, color: GREEN, fontWeight: 600, padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>100%</span>;
  if (score === "50") return <span style={{ background: AMBER_BG, color: AMBER, fontWeight: 600, padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>50%</span>;
  if (score === "0") return <span style={{ background: RED_BG, color: RED, fontWeight: 600, padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>0%</span>;
  if (score === "NA") return <span style={{ background: GRAY_L, color: "#888", fontWeight: 600, padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>N/A</span>;
  return <span style={{ color: "#aaa", fontSize: 12 }}>—</span>;
}

function CriterionRow({ crit, scoreObj, accentColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", cursor: "pointer" }}
      >
        <span style={{ fontWeight: 700, color: accentColor, fontSize: 13, minWidth: 28 }}>{crit.k}</span>
        <span style={{ flex: 1, fontSize: 13, color: "#333" }}>{crit.label}</span>
        <span style={{ fontSize: 11, color: "#999", minWidth: 36, textAlign: "right" }}>{crit.pts}pt</span>
        <ScoreChip score={scoreObj?.score} />
        {open ? <ChevronUp size={14} color="#999" /> : <ChevronDown size={14} color="#999" />}
      </div>
      {open && (
        <div style={{ padding: "0 4px 10px 38px", fontSize: 12, color: "#666", lineHeight: 1.5 }}>
          <div style={{ marginBottom: 4, fontStyle: "italic" }}>{crit.pergunta}</div>
          {scoreObj?.justificativa && <div>{scoreObj.justificativa}</div>}
        </div>
      )}
    </div>
  );
}

function InstrumentBlock({ title, accentBg, accentColor, totalMax, scoreData, criteriaCentral, criteriaForm, totals }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ background: accentBg, color: accentColor, fontWeight: 700, fontSize: 12, padding: "4px 10px", borderRadius: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: DARK }}>
          {totals.total.toFixed(1)} <span style={{ fontSize: 12, color: "#999", fontWeight: 400 }}>/ {totalMax}</span>
        </div>
      </div>
      <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 10px" }}>
        {criteriaCentral.map((c) => (
          <CriterionRow key={c.k} crit={c} scoreObj={scoreData?.[c.k]} accentColor={accentColor} />
        ))}
        {criteriaForm.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: "#999", padding: "8px 4px 4px", fontWeight: 600, letterSpacing: 0.5 }}>FORMATIVOS</div>
            {criteriaForm.map((c) => (
              <CriterionRow key={c.k} crit={c} scoreObj={scoreData?.[c.k]} accentColor={BLUE} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default function QALLEEvaluator() {
  const [caseType, setCaseType] = useState("P");
  const [caseCode, setCaseCode] = useState("");
  const [caseText, setCaseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedRow, setCopiedRow] = useState(false);
  const [avaliador, setAvaliador] = useState("");
  const [files, setFiles] = useState([]); // [{ name, text }]
  const [extracting, setExtracting] = useState(false);
  const [fallbackText, setFallbackText] = useState(null); // texto pra copiar manualmente quando o clipboard automático falha
  const fileInputRef = useRef(null);
  const fallbackRef = useRef(null);

  useEffect(() => {
    if (fallbackText && fallbackRef.current) {
      fallbackRef.current.focus();
      fallbackRef.current.select();
    }
  }, [fallbackText]);

  // Tenta copiar via Clipboard API; se falhar (comum dentro do sandbox do artifact),
  // mostra o texto num campo selecionável pra copiar manualmente (Ctrl+C / Cmd+C).
  async function copyToClipboardOrFallback(text, onSuccess) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API indisponível");
      }
      await navigator.clipboard.writeText(text);
      setFallbackText(null);
      onSuccess();
    } catch {
      setFallbackText(text);
    }
  }

  async function handleFileUpload(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const invalid = selected.find((f) => f.type !== "application/pdf");
    if (invalid) {
      setError("Apenas arquivos PDF são aceitos.");
      return;
    }
    setError("");
    setExtracting(true);
    try {
      const newFiles = [];
      const failed = [];
      for (const file of selected) {
        try {
          const text = await extractPdfText(file);
          if (!text) {
            failed.push(file.name);
          } else {
            newFiles.push({ name: file.name, text });
          }
        } catch {
          failed.push(file.name);
        }
      }
      if (newFiles.length) {
        setFiles((prev) => [...prev, ...newFiles]);
        setCaseText((prev) => {
          const additions = newFiles.map((f) => `\n\n--- ${f.name} ---\n${f.text}`).join("");
          return (prev || "") + additions;
        });
      }
      if (failed.length) {
        setError(`Não foi possível extrair texto de: ${failed.join(", ")} (pode ser PDF escaneado/imagem).`);
      }
    } catch (err) {
      setError("Erro ao ler PDF: " + err.message);
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(name) {
    setFiles((prev) => {
      const target = prev.find((f) => f.name === name);
      if (target) {
        setCaseText((ct) => ct.split(`\n\n--- ${target.name} ---\n${target.text}`).join(""));
      }
      return prev.filter((f) => f.name !== name);
    });
  }

  function clearFiles() {
    setFiles([]);
    setCaseText("");
  }

  async function handleEvaluate() {
    if (!caseText.trim()) {
      setError("Cole o texto do caso ou faça upload de um PDF antes de avaliar.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const prompt = buildPrompt(caseType, caseText);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const textBlock = data.content?.find((c) => c.type === "text");
      if (!textBlock) throw new Error("Resposta vazia do modelo.");
      const clean = textBlock.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      let totals = {};
      if (caseType === "P") {
        const i1 = calcI1(parsed.i1);
        const i2 = calcI2(parsed.i2);
        totals = { i1, i2, scoreTotal: (parsed.zera ? 0 : i1.total + i2.total) };
      } else {
        const i3 = calcI3(parsed.i3);
        totals = { i3, scoreTotal: parsed.zera ? 0 : i3.total };
      }

      const entry = {
        id: Date.now(),
        caseType,
        caseCode: caseCode || "(sem código)",
        timestamp: new Date().toLocaleString("pt-BR"),
        parsed,
        totals,
      };
      setResult(entry);
      setHistory((h) => [entry, ...h]);
    } catch (e) {
      setError("Erro ao processar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function buildSheetPayload(entry) {
    const row = {
      timestamp: new Date().toISOString(),
      avaliador: avaliador || "(não informado)",
      caso: entry.caseCode,
      tipo: entry.caseType === "P" ? "1a Consulta + Orientacoes" : "Assincrono",
    };
    if (entry.caseType === "P") {
      for (const c of [...I1_CENTRAL, ...I1_FORM]) {
        row[`I1_${c.k}_score`] = entry.parsed?.i1?.[c.k]?.score || "";
        row[`I1_${c.k}_justificativa`] = entry.parsed?.i1?.[c.k]?.justificativa || "";
      }
      for (const c of [...I2_CENTRAL, ...I2_FORM]) {
        row[`I2_${c.k}_score`] = entry.parsed?.i2?.[c.k]?.score || "";
        row[`I2_${c.k}_justificativa`] = entry.parsed?.i2?.[c.k]?.justificativa || "";
      }
      row.I1_total = entry.totals.i1.total.toFixed(2);
      row.I2_total = entry.totals.i2.total.toFixed(2);
    } else {
      // Instrumento assíncrono: colunas de I1/I2 ficam em branco; total vai na coluna geral.
      row.I1_total = "";
      row.I2_total = "";
    }
    row.total = entry.totals.scoreTotal.toFixed(2);
    // Colunas de comparação manual — sempre em branco no export.
    row["com ferramenta corrigida (I1)"] = "";
    row["com ferramenta corrigida (I2)"] = "";
    row["com ferramenta corrigida (total)"] = "";
    return row;
  }

  async function copyFullRow() {
    if (!result) return;
    const payload = buildSheetPayload(result);
    const line = SHEET_HEADERS.map((h) => payload[h] ?? "").join("\t");
    await copyToClipboardOrFallback(line, () => {
      setCopiedRow(true);
      setTimeout(() => setCopiedRow(false), 1800);
    });
  }

  async function copyForSheet() {
    if (!result) return;
    const score = result.totals.scoreTotal.toFixed(2);
    const text = `${result.caseCode}\t${score}`;
    await copyToClipboardOrFallback(text, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function loadFromHistory(entry) {
    setResult(entry);
    setCaseType(entry.caseType);
    setCaseCode(entry.caseCode);
    setShowHistory(false);
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", background: "#FAFBFC", minHeight: "100%", padding: "24px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: DARK }}>Avaliador LLM — QA Nutricional Voy</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Comparação Humano × LLM · mesmos critérios da planilha de calibração</div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "white", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#555", cursor: "pointer" }}
          >
            <History size={14} /> Histórico ({history.length})
          </button>
        </div>

        {showHistory && (
          <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 220, overflowY: "auto" }}>
            {history.length === 0 ? (
              <div style={{ fontSize: 12, color: "#999", textAlign: "center", padding: 12 }}>Nenhuma avaliação ainda.</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                  <button onClick={clearHistory} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: RED, background: "none", border: "none", cursor: "pointer" }}>
                    <Trash2 size={12} /> Limpar
                  </button>
                </div>
                {history.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => loadFromHistory(h)}
                    style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", fontSize: 12, cursor: "pointer", borderRadius: 4, borderBottom: `1px solid ${GRAY_L}` }}
                  >
                    <span style={{ fontWeight: 600 }}>{h.caseCode} <span style={{ color: "#999", fontWeight: 400 }}>({h.caseType === "P" ? "Consulta" : "Async"})</span></span>
                    <span style={{ color: DARK, fontWeight: 700 }}>{h.totals.scoreTotal.toFixed(1)} pts</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Input form */}
        <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 18, marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 5 }}>SEU NOME (AVALIADOR)</label>
            <input
              value={avaliador}
              onChange={(e) => setAvaliador(e.target.value)}
              placeholder="Ex: Senhora Igona"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 13, boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 4 }}>Vai junto com cada avaliação salva na planilha — ajuda a rastrear quem avaliou o quê.</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 5 }}>TIPO DE CASO</label>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setCaseType("P")}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${caseType === "P" ? RED : BORDER}`,
                    background: caseType === "P" ? RED_BG : "white",
                    color: caseType === "P" ? RED : "#888",
                  }}
                >
                  1ª Consulta + Orient.
                </button>
                <button
                  onClick={() => setCaseType("A")}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${caseType === "A" ? BLUE : BORDER}`,
                    background: caseType === "A" ? BLUE_BG : "white",
                    color: caseType === "A" ? BLUE : "#888",
                  }}
                >
                  Assíncrono
                </button>
              </div>
            </div>
            <div style={{ width: 110 }}>
              <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 5 }}>CÓDIGO</label>
              <input
                value={caseCode}
                onChange={(e) => setCaseCode(e.target.value)}
                placeholder={caseType === "P" ? "P01" : "A01"}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 5 }}>ARQUIVO(S) (PDF) {files.length > 0 && <span style={{ color: "#bbb", fontWeight: 400 }}>({files.length})</span>}</label>
          <div style={{ marginBottom: 12 }}>
            {files.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {files.map((f) => (
                  <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 6, border: `1px solid ${TEAL}`, background: GREEN_BG }}>
                    <FileCheck size={15} color={GREEN} />
                    <span style={{ flex: 1, fontSize: 12, color: GREEN, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <button onClick={() => removeFile(f.name)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                      <X size={15} color="#888" />
                    </button>
                  </div>
                ))}
                <button onClick={clearFiles} style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: RED, background: "none", border: "none", cursor: "pointer" }}>
                  <Trash2 size={12} /> Limpar todos
                </button>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 6, border: `1.5px dashed ${BORDER}`,
                background: GRAY_L, color: "#777", fontSize: 13, cursor: extracting ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {extracting ? (<><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Extraindo texto do(s) PDF(s)...</>) : (<><Upload size={15} /> {files.length > 0 ? "Adicionar mais PDF(s)" : "Selecionar arquivo(s) PDF"}</>)}
            </button>
            <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={handleFileUpload} style={{ display: "none" }} />
          </div>

          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 5 }}>TEXTO DO CASO {files.length > 0 && <span style={{ color: "#bbb", fontWeight: 400 }}>(inclui texto extraído do(s) PDF(s) — editável)</span>}</label>
          <textarea
            value={caseText}
            onChange={(e) => setCaseText(e.target.value)}
            placeholder={caseType === "P" ? "Cole o prontuário (SOAP) + e-mail de orientação aqui, ou faça upload de um PDF acima..." : "Cole o registro assíncrono (Zendesk) aqui, ou faça upload de um PDF acima..."}
            style={{ width: "100%", minHeight: 160, padding: 12, borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
          />

          {error && <div style={{ color: RED, fontSize: 12, marginTop: 8 }}>{error}</div>}

          <button
            onClick={handleEvaluate}
            disabled={loading}
            style={{
              marginTop: 12, width: "100%", padding: "11px 0", borderRadius: 7, border: "none",
              background: loading ? "#9AA5B1" : DARK, color: "white", fontSize: 14, fontWeight: 600,
              cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading ? (<><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Avaliando...</>) : "Avaliar caso"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: "#999" }}>{result.caseType === "P" ? "1ª Consulta + Orientações" : "Acompanhamento Assíncrono"}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: DARK }}>{result.caseCode}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#999" }}>SCORE LLM</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: result.totals.scoreTotal === 0 && result.parsed.zera ? RED : DARK }}>
                  {result.totals.scoreTotal.toFixed(1)}
                  <span style={{ fontSize: 14, color: "#999", fontWeight: 400 }}> / {result.caseType === "P" ? 100 : 20}</span>
                </div>
              </div>
            </div>

            {result.parsed.zera && (
              <div style={{ background: RED_BG, color: RED, fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontWeight: 600 }}>
                ⚠ Conduta zerada: {result.parsed.zera_motivo || "motivo não especificado"}
              </div>
            )}

            {result.caseType === "P" ? (
              <>
                <InstrumentBlock
                  title="INSTRUMENTO 1 — 1ª CONSULTA"
                  accentBg={RED_BG}
                  accentColor={RED}
                  totalMax={60}
                  scoreData={result.parsed.i1}
                  criteriaCentral={I1_CENTRAL}
                  criteriaForm={I1_FORM}
                  totals={result.totals.i1}
                />
                <InstrumentBlock
                  title="INSTRUMENTO 2 — ORIENTAÇÕES"
                  accentBg={RED_BG}
                  accentColor={RED}
                  totalMax={40}
                  scoreData={result.parsed.i2}
                  criteriaCentral={I2_CENTRAL}
                  criteriaForm={I2_FORM}
                  totals={result.totals.i2}
                />
              </>
            ) : (
              <InstrumentBlock
                title="INSTRUMENTO 3 — ASSÍNCRONO"
                accentBg={BLUE_BG}
                accentColor={BLUE}
                totalMax={20}
                scoreData={result.parsed.i3}
                criteriaCentral={I3_CRIT}
                criteriaForm={[]}
                totals={result.totals.i3}
              />
            )}

            <button
              onClick={copyFullRow}
              style={{
                marginTop: 8, width: "100%", padding: "11px 0", borderRadius: 7, border: "none",
                background: copiedRow ? GREEN : DARK, color: "white",
                fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <ClipboardCopy size={15} /> {copiedRow ? "Linha copiada!" : "Copiar linha para a planilha"}
            </button>
            <div style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 6 }}>
              Cole na aba da semana certa, a partir da coluna "timestamp" (ver aba "Leia-me" da planilha QA Semanal)
            </div>

            <button
              onClick={copyForSheet}
              style={{
                marginTop: 8, width: "100%", padding: "9px 0", borderRadius: 7,
                border: `1.5px solid ${BORDER}`, background: copied ? TEAL : "white", color: copied ? "white" : "#888",
                fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <ClipboardCopy size={13} /> {copied ? "Copiado!" : "Copiar só código + score"}
            </button>

            {fallbackText && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11.5, color: AMBER, marginBottom: 5, fontWeight: 600 }}>
                  A cópia automática está bloqueada aqui dentro. O texto já está selecionado abaixo — clique nele e aperte Ctrl+C (ou Cmd+C no Mac) pra copiar manualmente.
                </div>
                <textarea
                  ref={fallbackRef}
                  readOnly
                  value={fallbackText}
                  onFocus={(e) => e.target.select()}
                  style={{
                    width: "100%", minHeight: 64, padding: 8, fontSize: 11, fontFamily: "monospace",
                    border: `1.5px solid ${AMBER}`, borderRadius: 6, boxSizing: "border-box", resize: "vertical",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
