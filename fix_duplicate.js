const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

const duplicate = "  const togglePaysharkV2 = document.getElementById('toggle-paysharkv2');\n        const togglePaysharkV2 = document.getElementById('toggle-paysharkv2');";
const fixed = "        const togglePaysharkV2 = document.getElementById('toggle-paysharkv2');";

code = code.replace(duplicate, fixed);
fs.writeFileSync('js/admin.js', code);
