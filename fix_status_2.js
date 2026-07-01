const fs = require('fs');

let adminJs = fs.readFileSync('js/admin.js', 'utf8');

adminJs = adminJs.replace(/tx\.status\.toUpperCase\(\)\s*===\s*'PAID'\)/g, "tx.status.toUpperCase() === 'PAID' || tx.status.toUpperCase() === 'APPROVED')");
adminJs = adminJs.replace(/if\s*\(\s*uStatus\s*===\s*'PAID'\s*\)/g, "if (uStatus === 'PAID' || uStatus === 'APPROVED')");

fs.writeFileSync('js/admin.js', adminJs, 'utf8');
console.log('js/admin.js updated again');
