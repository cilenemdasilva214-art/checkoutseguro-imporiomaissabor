const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');
code = code.replace("escapeHtml(client.name) = tx.customer_name;", "client.name = tx.customer_name;");
code = code.replace("if (tx.customer_name && (!escapeHtml(client.name) || escapeHtml(client.name) === 'Sem Nome'))", "if (tx.customer_name && (!client.name || client.name === 'Sem Nome'))");
fs.writeFileSync('js/admin.js', code);
console.log('Fixed syntax error!');
