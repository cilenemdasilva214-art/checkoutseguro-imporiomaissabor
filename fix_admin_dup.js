const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

code = code.replace(
    "const togglePaguexCamp = document.getElementById('toggle-paguexcamp');\n        const togglePaguexCamp = document.getElementById('toggle-paguexcamp');",
    "const togglePaguexCamp = document.getElementById('toggle-paguexcamp');"
);
code = code.replace(
    "const cardPaguexCamp = document.getElementById('card-paguexcamp');\n        const cardPaguexCamp = document.getElementById('card-paguexcamp');",
    "const cardPaguexCamp = document.getElementById('card-paguexcamp');"
);
code = code.replace(
    "const togglePaguexCamp = document.getElementById('toggle-paguexcamp');\n  const togglePaguexCamp = document.getElementById('toggle-paguexcamp');",
    "const togglePaguexCamp = document.getElementById('toggle-paguexcamp');"
);
code = code.replace(
    "const cardPaguexCamp = document.getElementById('card-paguexcamp');\n  const cardPaguexCamp = document.getElementById('card-paguexcamp');",
    "const cardPaguexCamp = document.getElementById('card-paguexcamp');"
);
fs.writeFileSync('js/admin.js', code);
