const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

// 1. Initial values load
code = code.replace(
  "const pPublic = configData.paguex_public_key || '';",
  "const pPublic = configData.paguex_public_key || '';\n        const pcPublic = configData.paguex_camp_public_key || '';\n        const pcSecret = configData.paguex_camp_secret_key || '';"
);

// 2. Toggles & Cards bindings (top level)
code = code.replace(
  "const togglePaguex = document.getElementById('toggle-paguex');",
  "const togglePaguex = document.getElementById('toggle-paguex');\n        const togglePaguexCamp = document.getElementById('toggle-paguexcamp');"
);
code = code.replace(
  "const cardPaguex = document.getElementById('card-paguex');",
  "const cardPaguex = document.getElementById('card-paguex');\n        const cardPaguexCamp = document.getElementById('card-paguexcamp');"
);

// 3. Inputs bindings & assignments (top level)
code = code.replace(
  "const pPubKeyInput = document.getElementById('paguex-public-key');\n        const pSecKeyInput = document.getElementById('paguex-secret-key');",
  "const pPubKeyInput = document.getElementById('paguex-public-key');\n        const pSecKeyInput = document.getElementById('paguex-secret-key');\n        const pcPubKeyInput = document.getElementById('paguexcamp-public-key');\n        const pcSecKeyInput = document.getElementById('paguexcamp-secret-key');\n        if (pcPubKeyInput) pcPubKeyInput.value = pcPublic;\n        if (pcSecKeyInput) pcSecKeyInput.value = pcSecret;"
);

// 4. Setup Integrations bindings (line 5429ish)
code = code.replace(
  "const togglePaguex = document.getElementById('toggle-paguex');",
  "const togglePaguex = document.getElementById('toggle-paguex');\n  const togglePaguexCamp = document.getElementById('toggle-paguexcamp');"
);
code = code.replace(
  "const cardPaguex = document.getElementById('card-paguex');",
  "const cardPaguex = document.getElementById('card-paguex');\n  const cardPaguexCamp = document.getElementById('card-paguexcamp');"
);
code = code.replace(
  "const pPubKeyInput = document.getElementById('paguex-public-key');\n  const pSecKeyInput = document.getElementById('paguex-secret-key');",
  "const pPubKeyInput = document.getElementById('paguex-public-key');\n  const pSecKeyInput = document.getElementById('paguex-secret-key');\n  const pcPubKeyInput = document.getElementById('paguexcamp-public-key');\n  const pcSecKeyInput = document.getElementById('paguexcamp-secret-key');"
);

// 5. Update gateway toggles function
code = code.replace(
  "if (togglePaguex) togglePaguex.checked = (selected === 'paguex');",
  "if (togglePaguex) togglePaguex.checked = (selected === 'paguex');\n    if (togglePaguexCamp) togglePaguexCamp.checked = (selected === 'paguexcamp');"
);
code = code.replace(
  "if (cardPaguex) cardPaguex.classList.toggle('active', selected === 'paguex');",
  "if (cardPaguex) cardPaguex.classList.toggle('active', selected === 'paguex');\n    if (cardPaguexCamp) cardPaguexCamp.classList.toggle('active', selected === 'paguexcamp');"
);

// 6. Event listeners
code = code.replace(
  "if (togglePaguex) togglePaguex.addEventListener('change', () => { if(togglePaguex.checked) updateGatewayToggles('paguex'); else updateGatewayToggles(''); });",
  "if (togglePaguex) togglePaguex.addEventListener('change', () => { if(togglePaguex.checked) updateGatewayToggles('paguex'); else updateGatewayToggles(''); });\n  if (togglePaguexCamp) togglePaguexCamp.addEventListener('change', () => { if(togglePaguexCamp.checked) updateGatewayToggles('paguexcamp'); else updateGatewayToggles(''); });"
);

// 7. Save function activeGateway
code = code.replace(
  "if (togglePaguex && togglePaguex.checked) activeGateway = 'paguex';",
  "if (togglePaguex && togglePaguex.checked) activeGateway = 'paguex';\n      if (togglePaguexCamp && togglePaguexCamp.checked) activeGateway = 'paguexcamp';"
);

// 8. Save function payload building
code = code.replace(
  "const pPublic = pPubKeyInput ? pPubKeyInput.value.trim() : '';",
  "const pPublic = pPubKeyInput ? pPubKeyInput.value.trim() : '';\n      const pcPublic = pcPubKeyInput ? pcPubKeyInput.value.trim() : '';\n      const pcSecret = pcSecKeyInput ? pcSecKeyInput.value.trim() : '';"
);

// 9. Fetch payload
code = code.replace(
  "paguex_public_key: pPublic,\n            paguex_secret_key: pSecret,",
  "paguex_public_key: pPublic,\n            paguex_secret_key: pSecret,\n            paguex_camp_public_key: pcPublic,\n            paguex_camp_secret_key: pcSecret,"
);

// 10. Also update the initial toggle load near line 901
code = code.replace(
  "if (togglePaguex) togglePaguex.checked = (activeGateway === 'paguex');",
  "if (togglePaguex) togglePaguex.checked = (activeGateway === 'paguex');\n        if (togglePaguexCamp) togglePaguexCamp.checked = (activeGateway === 'paguexcamp');"
);
code = code.replace(
  "if (cardPaguex) cardPaguex.classList.toggle('active', activeGateway === 'paguex');",
  "if (cardPaguex) cardPaguex.classList.toggle('active', activeGateway === 'paguex');\n        if (cardPaguexCamp) cardPaguexCamp.classList.toggle('active', activeGateway === 'paguexcamp');"
);


fs.writeFileSync('js/admin.js', code);
