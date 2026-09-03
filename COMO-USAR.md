# Como abrir o avaliador no Claude — guia da nutricionista

Este guia é para quem vai **usar** o avaliador de QA. Não precisa entender de código nem mexer no GitHub.

O avaliador é uma ferramenta que roda dentro do Claude, chamada **artifact**. Você monta o artifact uma vez, com o prompt abaixo, e depois é só usar.

> Faça isso na sua conta **corporativa** do Claude (`@manual.co`), porque você vai colar prontuário de paciente.

---

## Passo 1 — Abrir um chat novo

Vá em [claude.ai](https://claude.ai) e comece uma conversa nova. Não reaproveite um chat antigo: o Claude pode misturar instruções anteriores.

## Passo 2 — Colar o prompt

Copie o bloco inteiro abaixo e cole como primeira mensagem.

```
Busque o conteúdo desta URL e crie um artifact React com ele:

https://raw.githubusercontent.com/carlosmanual/qa-nutricional/v4.1.4/src/qa_nutricional.jsx

Regras obrigatórias:

1. Reproduza o arquivo EXATAMENTE como está, do primeiro ao último caractere. São 1564 linhas.
2. Não resuma, não encurte, não reescreva, não reorganize, não "melhore" nada. Não corrija o que parecer estranho: é intencional.
3. Nunca escreva placeholders como "// resto do código igual", "// ...", "[mantém o restante]" ou equivalente. O artifact tem que estar completo.
4. Não altere nenhuma constante do topo do arquivo, em especial PROMPT_VERSION, RUBRICA_HASH, MODEL, EFFORT, MAX_TOKENS e DECIMAL_SEP. Elas mudam a nota que a ferramenta dá.
5. Não altere nenhum texto de critério de avaliação. É uma rubrica clínica validada.
6. Se por qualquer motivo você NÃO conseguir acessar a URL, PARE e me diga isso. Não escreva de memória, não invente um avaliador parecido e não reconstrua a rubrica por conta própria.
7. Se o arquivo não couber inteiro na sua resposta, PARE e me diga isso. Não entregue uma versão parcial.

Ao terminar, confirme em uma linha cada item:
- quantas linhas o artifact tem;
- que a última linha do arquivo é uma chave de fechamento "}";
- que o arquivo contém as constantes PROMPT_VERSION = "v4.1" e RUBRICA_HASH = "3fd979ff";
- que o arquivo contém as funções ruleAntropometria, ruleAlergeno e buildSheetRow.
```

## Passo 3 — Conferir o cabeçalho

Quando o artifact abrir, olhe o topo. Tem que estar escrito exatamente:

> **Avaliador LLM — QA Nutricional Voy**
> Prompt v4.1 · claude-opus-5 · effort medium · rubrica `3fd979ff`

Os quatro valores têm que bater, principalmente o último. Esse código de 8 caracteres é a impressão digital da rubrica: se o Claude mudou qualquer texto de critério ao montar, ele muda junto e a ferramenta se bloqueia sozinha, com um aviso vermelho. Se aparecer outro valor, outra versão ou outro modelo, recomece do passo 1.

## Passo 4 — Teste de 30 segundos (faça sempre)

Antes de avaliar um caso real, rode este teste. Ele usa uma paciente **fictícia** e serve para provar que as regras automáticas chegaram inteiras.

Preencha:

- **Código:** `Xx99` (2 letras + 2 dígitos; é só teste)
- **SOAP:** cole o texto abaixo
- **E-mail e PDFs:** deixe vazios

```
Paciente fictícia para teste, 41 anos. Peso 88 kg, altura 1,65 m.
Relata café da manhã com pão e café, almoço no restaurante do trabalho e jantar em casa.
Diz que belisca doces à tarde quando está ansiosa.
Conduta: organizar lanche da tarde com proteína e fruta.
```

Clique em **Avaliar caso** e confira as quatro coisas:

| O que olhar | Resultado esperado |
|---|---|
| Bloco amarelo de flags | Aparece, e uma das linhas diz que o Instrumento 2 não foi avaliado |
| Painel "Fatos extraídos" | Peso ✓ verde · Altura ✓ verde · **IMC ✗ vermelho** |
| Critério **3a** | Nota **0%**, com etiqueta azul "regra automática" e a frase "IMC ausente(s) no SOAP" |
| Score no topo | Sobre **60**, não sobre 100 |
| Cabeçalho | rubrica `3fd979ff`, sem banner vermelho |

Bateu tudo? O artifact está correto. Não bateu? O código veio incompleto: recomece do passo 1.

> Esse teste existe porque o texto tem 1564 linhas. Um artifact truncado continua bonito na tela, mas perde as regras automáticas e passa a dar nota errada em silêncio. O teste é o que revela isso.

## Passo 5 — Usar

1. Preencha seu nome (fica salvo no navegador).
2. Código do caso: as 2 letras da nutricionista + o número do caso com 2 dígitos, ex.: `Ab10`. Maiúscula e minúscula importam (`Ab10`, não `AB10`): a planilha usa essas 2 letras para saber de quem é o caso. Se o formato não bater, aparece um aviso amarelo, mas a cópia funciona mesmo assim.
3. **Cole o SOAP e o e-mail em campos separados.** Não junte os dois no mesmo campo: metade dos critérios depende de saber qual texto é qual.
4. Suba os PDFs enviados ao paciente.
5. **Avaliar caso**. Leva de 1 a 2 minutos.
6. Leia primeiro o bloco amarelo de flags e o painel de fatos. Depois abra os critérios marcados com ⚠.
7. Se quiser conferir o que a ferramenta leu de um PDF, clique em **ver texto** no chip do arquivo. Um PDF de prescrição costuma ter poucas linhas: isso é normal e não é erro.
8. **Copiar linha para a planilha** e cole na aba da semana, na célula da coluna `timestamp` (coluna D) da linha do caso. As colunas A a C (`Caso` e os dois links) você preenche à mão. A coluna `nutricionista`, no fim, se preenche sozinha.

Você pode avaliar vários casos no mesmo artifact, um depois do outro. Só reabra o passo 4 se recarregar a página e montar o artifact de novo.

---

## Quando algo dá errado

| Sintoma | O que fazer |
|---|---|
| O Claude diz que não conseguiu acessar a URL | Baixe o arquivo pelo botão **Raw** no GitHub, anexe ao chat e use o prompt alternativo abaixo |
| O cabeçalho mostra outra versão ou outro modelo | Recomece do passo 1, em chat novo |
| O teste do passo 4 não bate | Recomece do passo 1, em chat novo |
| "Erro ao processar: Resposta truncada" | O caso está muito longo. Tire os PDFs menos relevantes e avalie de novo |
| "O modelo recusou avaliar este caso" | Avalie manualmente e avise o Carlos |
| Banner vermelho "Este artifact não é a versão publicada" | O Claude alterou a rubrica ao montar. O banner diz **qual bloco** mudou. Recomece do passo 1, em chat novo, e não deixe ele "melhorar" nada. Se cair no mesmo bloco duas vezes, mande a frase do banner para o Carlos |
| Aviso de PDF sem texto extraível | É um PDF escaneado (foto). O modelo não lê imagem: avalie esse material à parte |
| Banner vermelho "Resultado inválido" | O modelo não respondeu no formato certo. Clique em "Avaliar caso" de novo. Se repetir, abra "Resposta bruta do modelo", copie e mande para o Carlos |
| A cópia automática não funciona | Aparece uma caixa com o texto já selecionado. Aperte Ctrl+C (Cmd+C no Mac) |
| A linha colou toda numa célula só | Cole com **Colar especial → Somente texto**, ou avise o Carlos |

### Prompt alternativo (arquivo anexado)

Se a busca pela URL falhar, baixe o arquivo e anexe ao chat com esta mensagem:

```
Crie um artifact React com o conteúdo exato do arquivo em anexo, do primeiro ao último caractere.

Não resuma, não encurte, não reescreva, não "melhore" e não corrija nada. Não use placeholders como "// resto do código igual". Não altere as constantes PROMPT_VERSION, RUBRICA_HASH, MODEL, EFFORT, MAX_TOKENS e DECIMAL_SEP, nem nenhum texto de critério.

Se o arquivo não couber inteiro na resposta, pare e me avise em vez de entregar uma versão parcial.

Ao terminar, confirme quantas linhas o artifact tem e que ele contém PROMPT_VERSION = "v4.1" e RUBRICA_HASH = "3fd979ff".
```

---

## Para quem mantém a ferramenta

O prompt aponta para a **tag `v4.1.4`**, não para `main`. Assim quem monta o artifact sempre pega a versão testada, mesmo que `main` esteja no meio de uma alteração.

Ao promover uma versão nova:

1. `git tag -a v5 -m "..." && git push origin v5`
2. Trocar `v4.1.4` por `v5` nas duas URLs e nas checagens deste arquivo (inclusive o número de linhas e o hash da rubrica, que `bash tests/run.sh` imprime).
3. Avisar a equipe para remontar o artifact. Enquanto não remontarem, seguem na versão anterior; o cabeçalho do artifact mostra qual é.

Alternativa com menos passos para a equipe: montar o artifact uma vez, publicá-lo e distribuir o link. Nesse caso ninguém precisa deste guia, e a atualização vira uma republicação só sua.
