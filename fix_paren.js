const fs = require('fs');
let code = fs.readFileSync('netlify/functions/checkout.js', 'utf8');

code = code.replace(
    ": 'PagueX')))))} e salva",
    ": 'PagueX'))))} e salva"
);
fs.writeFileSync('netlify/functions/checkout.js', code);
