const fs = require('fs');

let adminJs = fs.readFileSync('js/admin.js', 'utf8');

// Replace all instances of checking for PAID or PRE-APPROVED to also include APPROVED
adminJs = adminJs.replace(/tx\.status\.toUpperCase\(\)\s*===\s*'PAID'\s*\|\|\s*tx\.status\.toUpperCase\(\)\s*===\s*'PRE-APPROVED'/g, "tx.status.toUpperCase() === 'PAID' || tx.status.toUpperCase() === 'APPROVED' || tx.status.toUpperCase() === 'PRE-APPROVED'");
adminJs = adminJs.replace(/tx\.status\.toUpperCase\(\)\s*===\s*'PENDING'\s*\|\|\s*tx\.status\.toUpperCase\(\)\s*===\s*'PAID'/g, "tx.status.toUpperCase() === 'PENDING' || tx.status.toUpperCase() === 'PAID' || tx.status.toUpperCase() === 'APPROVED'");

fs.writeFileSync('js/admin.js', adminJs, 'utf8');
console.log('js/admin.js updated');

let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.replace(/<option value="APPROVED">Aprovado \(Pago\)<\/option>/g, '<option value="PAID">Aprovado (Pago)</option>');
fs.writeFileSync('admin.html', adminHtml, 'utf8');
console.log('admin.html updated');

