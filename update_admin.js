const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

// 1. Initial values load
code = code.replace(
  "        const psSecret = configData.payshark_secret_key || '';",
  "        const psSecret = configData.payshark_secret_key || '';\n        const psV2Api = configData.paysharkv2_api_key || '';\n        const psV2Transfer = configData.paysharkv2_transfer_key || '';"
);

// 2. Load toggles
code = code.replace(
  "        const togglePayshark = document.getElementById('toggle-payshark');",
  "        const togglePayshark = document.getElementById('toggle-payshark');\n        const togglePaysharkV2 = document.getElementById('toggle-paysharkv2');"
);

// 3. Load cards
code = code.replace(
  "        const cardPayshark = document.getElementById('card-payshark');",
  "        const cardPayshark = document.getElementById('card-payshark');\n        const cardPaysharkV2 = document.getElementById('card-paysharkv2');"
);

// 4. Set toggle checked state
code = code.replace(
  "        if (togglePayshark) togglePayshark.checked = (activeGateway === 'payshark');",
  "        if (togglePayshark) togglePayshark.checked = (activeGateway === 'payshark');\n        if (togglePaysharkV2) togglePaysharkV2.checked = (activeGateway === 'paysharkv2');"
);

// 5. Set card active class
code = code.replace(
  "        if (cardPayshark) cardPayshark.classList.toggle('active', activeGateway === 'payshark');",
  "        if (cardPayshark) cardPayshark.classList.toggle('active', activeGateway === 'payshark');\n        if (cardPaysharkV2) cardPaysharkV2.classList.toggle('active', activeGateway === 'paysharkv2');"
);

// 6. Set input values
code = code.replace(
  "        const psSecKeyInput = document.getElementById('payshark-secret-key');",
  "        const psSecKeyInput = document.getElementById('payshark-secret-key');\n        const psV2ApiInput = document.getElementById('paysharkv2-api-key');\n        const psV2TransferInput = document.getElementById('paysharkv2-transfer-key');\n        if (psV2ApiInput) psV2ApiInput.value = psV2Api;\n        if (psV2TransferInput) psV2TransferInput.value = psV2Transfer;"
);


// Now for the save part (around 5421)
code = code.replace(
  "  const togglePayshark = document.getElementById('toggle-payshark');",
  "  const togglePayshark = document.getElementById('toggle-payshark');\n  const togglePaysharkV2 = document.getElementById('toggle-paysharkv2');"
);

code = code.replace(
  "  const cardPayshark = document.getElementById('card-payshark');",
  "  const cardPayshark = document.getElementById('card-payshark');\n  const cardPaysharkV2 = document.getElementById('card-paysharkv2');"
);

code = code.replace(
  "  const psSecKeyInput = document.getElementById('payshark-secret-key');",
  "  const psSecKeyInput = document.getElementById('payshark-secret-key');\n  const psV2ApiInput = document.getElementById('paysharkv2-api-key');\n  const psV2TransferInput = document.getElementById('paysharkv2-transfer-key');"
);

code = code.replace(
  "    if (togglePayshark) togglePayshark.checked = (selected === 'payshark');",
  "    if (togglePayshark) togglePayshark.checked = (selected === 'payshark');\n    if (togglePaysharkV2) togglePaysharkV2.checked = (selected === 'paysharkv2');"
);

code = code.replace(
  "    if (cardPayshark) cardPayshark.classList.toggle('active', selected === 'payshark');",
  "    if (cardPayshark) cardPayshark.classList.toggle('active', selected === 'payshark');\n    if (cardPaysharkV2) cardPaysharkV2.classList.toggle('active', selected === 'paysharkv2');"
);

code = code.replace(
  "  if (togglePayshark) togglePayshark.addEventListener('change', () => { if(togglePayshark.checked) updateGatewayToggles('payshark'); else updateGatewayToggles(''); });",
  "  if (togglePayshark) togglePayshark.addEventListener('change', () => { if(togglePayshark.checked) updateGatewayToggles('payshark'); else updateGatewayToggles(''); });\n  if (togglePaysharkV2) togglePaysharkV2.addEventListener('change', () => { if(togglePaysharkV2.checked) updateGatewayToggles('paysharkv2'); else updateGatewayToggles(''); });"
);

code = code.replace(
  "      if (togglePayshark && togglePayshark.checked) activeGateway = 'payshark';",
  "      if (togglePayshark && togglePayshark.checked) activeGateway = 'payshark';\n      if (togglePaysharkV2 && togglePaysharkV2.checked) activeGateway = 'paysharkv2';"
);

code = code.replace(
  "        const psPublic = psPubKeyInput ? psPubKeyInput.value : '';\n        const psSecret = psSecKeyInput ? psSecKeyInput.value : '';",
  "        const psPublic = psPubKeyInput ? psPubKeyInput.value : '';\n        const psSecret = psSecKeyInput ? psSecKeyInput.value : '';\n        const psV2Api = psV2ApiInput ? psV2ApiInput.value : '';\n        const psV2Transfer = psV2TransferInput ? psV2TransferInput.value : '';"
);

code = code.replace(
  "            payshark_public_key: psPublic,\n            payshark_secret_key: psSecret,",
  "            payshark_public_key: psPublic,\n            payshark_secret_key: psSecret,\n            paysharkv2_api_key: psV2Api,\n            paysharkv2_transfer_key: psV2Transfer,"
);

fs.writeFileSync('js/admin.js', code);
console.log('Fixed admin.js');
