const fs = require('fs');

let adminJs = fs.readFileSync('js/admin.js', 'utf8');

adminJs = adminJs.replace(/\s*const pfTransferInput = document\.getElementById\('pagflex-transfer-key'\);/g, "");
adminJs = adminJs.replace(/\s*if \(pfTransferInput\) pfTransferInput\.value = pagflexTransfer;/g, "");
adminJs = adminJs.replace(/\s*const pfTransfer = pfTransferInput \? pfTransferInput\.value\.trim\(\) : '';/g, "\n      const pfTransfer = ''; // Removed from UI");

fs.writeFileSync('js/admin.js', adminJs, 'utf8');
console.log('js/admin.js transfer key removed');

