#!/usr/bin/env bash
# Testes de lógica pura (regex, regras duras, pontuação, export). Não chama a API.
# Requer Node ≥ 18; baixa esbuild via npx na primeira execução.
set -euo pipefail
cd "$(dirname "$0")"
npx -y esbuild ../src/qa_nutricional.jsx --loader:.jsx=jsx --format=esm --jsx=automatic --outfile=./out.js --log-level=warning
sed -i.bak -e 's#from "react/jsx-runtime"#from "./stubs/jsx-runtime.js"#; s#from "react"#from "./stubs/react.js"#; s#from "lucide-react"#from "./stubs/lucide-react.js"#' out.js && rm -f out.js.bak
echo 'export { norm, foundIn, evidenciaStatus, preChecks, calcI1, calcI2, calcI3, ruleAntropometria, ruleAcoplamento2a2b, ruleProximosPontos, rulePrioridade, ruleAlergeno, coerceInstrument, coerceFatos, coerceScore, buildSheetRow, buildSchemaP, buildSchemaA, buildSystemP, buildSystemA, buildUserP, SHEET_HEADERS, I1_ALL, I2_ALL };' >> out.js
node logic.test.mjs
rm -f out.js
