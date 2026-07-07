const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

const dup1 = "  const cardPaysharkV2 = document.getElementById('card-paysharkv2');\n        const cardPaysharkV2 = document.getElementById('card-paysharkv2');";
const fixed1 = "        const cardPaysharkV2 = document.getElementById('card-paysharkv2');";
code = code.replace(dup1, fixed1);

const dup2 = "  const psV2ApiInput = document.getElementById('paysharkv2-api-key');\n  const psV2TransferInput = document.getElementById('paysharkv2-transfer-key');\n        const psV2ApiInput = document.getElementById('paysharkv2-api-key');\n        const psV2TransferInput = document.getElementById('paysharkv2-transfer-key');";
const fixed2 = "        const psV2ApiInput = document.getElementById('paysharkv2-api-key');\n        const psV2TransferInput = document.getElementById('paysharkv2-transfer-key');";
code = code.replace(dup2, fixed2);

fs.writeFileSync('js/admin.js', code);
