const fs = require('fs');

const escapeFunc = 
function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
;

function patchAdminJs() {
  let adminJs = fs.readFileSync('js/admin.js', 'utf8');
  if (!adminJs.includes('function escapeHtml')) {
    adminJs = escapeFunc + "\n" + adminJs;
  }

  // Common customer fields to escape
  adminJs = adminJs.replace(/order\.customer_name \|\| 'Sem Nome'/g, "escapeHtml(order.customer_name || 'Sem Nome')");
  adminJs = adminJs.replace(/order\.customer_email \|\| 'Não informado'/g, "escapeHtml(order.customer_email || 'Não informado')");
  adminJs = adminJs.replace(/order\.customer_cpf \|\| '-'/g, "escapeHtml(order.customer_cpf || '-')");
  adminJs = adminJs.replace(/tx\.customer_name \|\| 'Sem Nome'/g, "escapeHtml(tx.customer_name || 'Sem Nome')");
  adminJs = adminJs.replace(/tx\.customer_email \|\| 'Não informado'/g, "escapeHtml(tx.customer_email || 'Não informado')");
  
  adminJs = adminJs.replace(/client\.name/g, "escapeHtml(client.name)");
  adminJs = adminJs.replace(/client\.email/g, "escapeHtml(client.email)");
  adminJs = adminJs.replace(/lead\.customer_name/g, "escapeHtml(lead.customer_name)");
  adminJs = adminJs.replace(/lead\.customer_email/g, "escapeHtml(lead.customer_email)");

  fs.writeFileSync('js/admin.js', adminJs, 'utf8');
}

function patchAppJs() {
  let appJs = fs.readFileSync('js/app.js', 'utf8');
  if (!appJs.includes('function escapeHtml')) {
    appJs = escapeFunc + "\n" + appJs;
  }
  
  appJs = appJs.replace(/\$\{item\.title\}/g, "");
  appJs = appJs.replace(/\$\{item\.sku \|\| 'SHPFY-DEFAULT'\}/g, "");
  
  fs.writeFileSync('js/app.js', appJs, 'utf8');
}

patchAdminJs();
patchAppJs();
console.log('Patched JS files for XSS');
