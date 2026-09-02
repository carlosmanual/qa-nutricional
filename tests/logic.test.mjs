import * as m from "./out.js";
let fails=0; const ok=(c,msg)=>{ if(!c){fails++; console.log("FAIL:",msg);} else console.log("ok  :",msg); };
ok(m.norm("Alimentação  saudável!")==="alimentacaosaudavel","norm remove acentos/pontuação/espaços");
ok(m.foundIn("café da manhã com pão e queijo",[m.norm("Paciente relata café da manhã com pão e queijo às 7h")]),"foundIn substring");
ok(m.foundIn("alimen tação saudável todos os dias",[m.norm("...alimentação saudável todos os dias...")]),"foundIn tolera espaço intra-palavra do pdf.js");
ok(!m.foundIn("come chocolate escondido à noite",[m.norm("Paciente relata café da manhã com pão")]),"foundIn rejeita citação inventada");
ok(m.foundIn("kg",[m.norm("peso 92 kg")])===true,"foundIn curta");
ok(m.evidenciaStatus("Retorno em 15 dias",[m.norm("SOAP sem isso")],[m.norm("email: retorno em 15 dias")])==="fora_escopo","fora_escopo detectado");
const soapFull="Paciente F, 42a. Peso: 92 kg. Altura: 1,70 m. IMC: 31,8. Relata alergia a amendoim. Conduta: ... PRÓXIMOS PONTOS: retorno em 15 dias para avaliar adesão.";
const soapNoIMC="Paciente F, 42a. Peso: 92 kg. Altura 1,70. Conduta: ... Próximos pontos:";
let p=m.preChecks(soapFull);
ok(p.hasPeso&&p.hasAltura&&p.hasIMC,"regex acha peso/altura/IMC");
ok(p.hasProximosPontos,"regex acha próximos pontos com conteúdo");
ok(p.dicaAlergia.length===1&&/amendoim/.test(p.dicaAlergia[0]),"dica alergia extraída");
p=m.preChecks(soapNoIMC);
ok(!p.hasIMC&&p.hasPeso&&p.hasAltura,"regex: sem IMC");
ok(!p.hasProximosPontos,"próximos pontos vazio → ausente");
const all100=(crits)=>Object.fromEntries(crits.map(c=>[c.k,{score:"100",evidencia:"x",justificativa:"",origem:"llm"}]));
let i1=all100(m.I1_ALL); let t=m.calcI1(i1); ok(t.total===60&&t.denominador===60,"I1 tudo 100 = 60/60");
i1=all100(m.I1_ALL); i1["1b"].score="NA"; t=m.calcI1(i1); ok(t.total===54&&t.denominador===54,"1b NA sai do denominador → 54/54");
i1=all100(m.I1_ALL); i1["2a"].score="0"; const fl=[]; m.ruleAcoplamento2a2b(i1,fl); t=m.calcI1(i1);
ok(i1["2b"].score==="NA"&&i1["2b"].origem==="regra","2a=0 → 2b NA por regra");
ok(t.total===60-6&&t.denominador===60,"2b NA: 3a vale 19 → total 54/60");
i1=all100(m.I1_ALL); i1["2b"].score="NA"; const fl2=[]; m.ruleAcoplamento2a2b(i1,fl2); ok(i1["2b"].score==="0"&&fl2.length===1,"2b NA sem 2a=0 → 0 + flag");
// antropometria
i1=all100(m.I1_ALL); const fatosNo=m.coerceFatos({peso:{presente:true,valor:"92 kg",citacao:"Peso: 92 kg"},altura:{presente:true,valor:"1,70",citacao:"Altura 1,70"},imc:{presente:false,valor:"",citacao:""}});
const fl3=[]; const pre=m.preChecks(soapNoIMC); const a=m.ruleAntropometria(i1,fatosNo,pre,m.norm(soapNoIMC),fl3);
ok(i1["3a"].score==="0"&&i1["3a"].origem==="regra"&&i1["3a"].llmScore==="100","sem IMC → 3a=0 por regra, LLM 100 preservado");
ok(fl3.some(f=>f.startsWith("3a:")),"flag de discordância 3a");
// LLM diz IMC presente com citação localizável, regex não achou
const soapIMCword="Peso 92 kg, altura 1,70 m, índice corporal 31,8 kg por metro quadrado.";
i1=all100(m.I1_ALL); const fatosYes=m.coerceFatos({peso:{presente:true,citacao:"Peso 92 kg"},altura:{presente:true,citacao:"altura 1,70 m"},imc:{presente:true,valor:"31,8",citacao:"índice corporal 31,8 kg por metro quadrado"}});
const fl4=[]; m.ruleAntropometria(i1,fatosYes,m.preChecks(soapIMCword),m.norm(soapIMCword),fl4);
ok(i1["3a"].score==="100","IMC aceito via citação do LLM quando regex falha");
// citação inventada → ausente
i1=all100(m.I1_ALL); const fatosFake=m.coerceFatos({peso:{presente:true,citacao:"Peso: 92 kg"},altura:{presente:true,citacao:"Altura 1,70"},imc:{presente:true,valor:"31",citacao:"IMC 31 obesidade grau I"}});
const fl5=[]; m.ruleAntropometria(i1,fatosFake,m.preChecks(soapNoIMC),m.norm(soapNoIMC),fl5);
ok(i1["3a"].score==="0"&&fl5.some(f=>/não foi localizada/.test(f)),"citação de IMC inventada → 3a=0 + flag");
// próximos pontos
i1=all100(m.I1_ALL); const fl6=[]; m.ruleProximosPontos(i1,m.coerceFatos({}),m.preChecks(soapNoIMC),m.norm(soapNoIMC),fl6); ok(i1["7a"].score==="50","sem próximos pontos → 7a limitado a 50");
// I2
let i2=all100(m.I2_ALL); m.rulePrioridade(i2,m.coerceFatos({comportamento_e_prioridade:false,pdf_tema_e_prioridade:true}),1);
ok(i2["A2"].score==="NA"&&i2["B2"].score==="100","A2 NA por prioridade; B2 mantido");
ok(m.calcI2(i2).total===40,"I2: NA vale máximo → 40/40");
i2=all100(m.I2_ALL); m.rulePrioridade(i2,m.coerceFatos({comportamento_e_prioridade:true,pdf_tema_e_prioridade:true}),0); ok(i2["B2"].score==="NA","sem PDF → B2 NA");
// alergeno
i2=all100(m.I2_ALL); const orient=[m.norm("Receita: bolo de amendoim com banana. Responda este e-mail.")];
const fA=m.coerceFatos({alergias_documentadas:[{termo:"amendoim",citacao:"alergia a amendoim"}],alergenico_contradiz_material:{valor:true,citacao:"bolo de amendoim com banana"},pdf_tema_e_prioridade:true,comportamento_e_prioridade:true});
const fl7=[]; m.ruleAlergeno(i2,fA,orient,fl7); ok(i2["B2"].score==="0"&&i2["B2"].origem==="regra","alérgeno: regex+LLM → B2=0");
i2=all100(m.I2_ALL); const fB=m.coerceFatos({alergias_documentadas:[{termo:"amendoim",citacao:"x"}],alergenico_contradiz_material:{valor:false,citacao:""}});
const fl8=[]; m.ruleAlergeno(i2,fB,orient,fl8); ok(i2["B2"].score==="100"&&fl8.length===1&&/REVISAR/.test(fl8[0]),"alérgeno: só regex → flag, score intacto");
// coerce
ok(m.coerceScore(" n/a ",true)==="NA"&&m.coerceScore(100,false)==="100"&&m.coerceScore("NA",false)===""&&m.coerceScore("75",false)==="","coerceScore");
// export
const entry={caseType:"P",caseCode:"P01",flags:["a\tb","c\nd"],meta:{model:"claude-opus-5",effort:"medium"},crit:{i1:all100(m.I1_ALL),i2:all100(m.I2_ALL)},totals:{i1:{total:58.5,denominador:60},i2:{total:40,denominador:40},scoreTotal:98.5}};
entry.crit.i1["1a"].justificativa="linha 1\nlinha 2\tcom tab";
const row=m.buildSheetRow(entry,"Igona"); const cells=row.split("\t");
ok(cells.length===m.SHEET_HEADERS.length,`export: ${cells.length} colunas = ${m.SHEET_HEADERS.length} headers`);
ok(!/[\r\n]/.test(row),"export: sem quebras de linha");
ok(cells[m.SHEET_HEADERS.indexOf("I1_total")]==="58,50"&&cells[m.SHEET_HEADERS.indexOf("total")]==="98,50","export: vírgula decimal");
ok(cells[m.SHEET_HEADERS.indexOf("prompt_version")]==="v4","export: prompt_version");
// schema / system
const sch=m.buildSchemaP(true); ok(sch.required.includes("i2")&&Object.keys(sch.properties.i1.properties).length===9&&Object.keys(sch.properties.i2.properties).length===10,"schema P: 9 + 10 critérios");
ok(sch.properties.i1.properties["1b"].properties.score.enum.includes("NA")&&!sch.properties.i1.properties["1a"].properties.score.enum.includes("NA"),"schema: NA só onde permitido");
ok(!m.buildSchemaP(false).required.includes("i2"),"schema P sem I2");
const sys=m.buildSystemP(true); ok(sys.indexOf("DEFINIÇÕES")<sys.indexOf("INSTRUMENTO 1")&&sys.includes("ZERO AUTOMÁTICO")&&sys.includes("CORTE DE SEGURANÇA"),"system: definições antes dos critérios, regras presentes");
console.log("system chars:",sys.length,"~tokens:",Math.round(sys.length/3.5));
const usr=m.buildUserP(soapFull,"Olá",[{name:'g"uia.pdf',text:"PDF"}],["Relata alergia a amendoim."]); ok(usr.includes("<soap>")&&usr.includes("<email>")&&usr.includes('<material n="1" nome="g\'uia.pdf">')&&usr.includes("ATENÇÃO"),"user: tags e dica de alergia");
console.log(fails?`\n${fails} FALHA(S)`:"\nTODOS OS TESTES PASSARAM");
process.exit(fails?1:0);
