const fs = require('fs');

function replaceInFile(file) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/paysharkv2_transfer_key/g, 'paysharkv2_webhook_secret');
    code = code.replace(/paysharkv2-transfer-key/g, 'paysharkv2-webhook-secret');
    fs.writeFileSync(file, code);
}

replaceInFile('js/admin.js');
replaceInFile('netlify/functions/config.js');
console.log('Replaced transfer key with webhook secret');
