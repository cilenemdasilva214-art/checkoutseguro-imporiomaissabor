const fs = require('fs');
const brainDir = 'C:/Users/MAC-1/.gemini/antigravity/brain/d7a8c0c5-32a8-46c0-8e10-3d09974a52c0';
let code = fs.readFileSync(brainDir + '/task.md', 'utf8');

code = code.replace('- [ ] dmin.html: Adicionar a aba (card) do gateway "Payshark V2 VERSÃO NOVA" com o campo para a chave de API de pagamento.', '- [x] dmin.html: Adicionar a aba (card) do gateway "Payshark V2 VERSÃO NOVA" com o campo para a chave de API de pagamento.');
code = code.replace('- [ ] js/admin.js: Implementar a lógica de ativação/desativação e carregamento da chave do Payshark V2.', '- [/] js/admin.js: Implementar a lógica de ativação/desativação e carregamento da chave do Payshark V2.');

fs.writeFileSync(brainDir + '/task.md', code);
