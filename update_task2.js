const fs = require('fs');
const brainDir = 'C:/Users/MAC-1/.gemini/antigravity/brain/d7a8c0c5-32a8-46c0-8e10-3d09974a52c0';
let code = fs.readFileSync(brainDir + '/task.md', 'utf8');

code = code.replace('- [/] js/admin.js: Implementar a lógica de ativação/desativação e carregamento da chave do Payshark V2.', '- [x] js/admin.js: Implementar a lógica de ativação/desativação e carregamento da chave do Payshark V2.');
code = code.replace('- [ ] 
etlify/functions/config.js: Incluir a paysharkv2_api_key nos métodos GET/POST e mascará-la no acesso público.', '- [/] 
etlify/functions/config.js: Incluir a paysharkv2_api_key nos métodos GET/POST e mascará-la no acesso público.');

fs.writeFileSync(brainDir + '/task.md', code);
