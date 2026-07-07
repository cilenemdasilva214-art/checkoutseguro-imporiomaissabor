const fs = require('fs');
let code = fs.readFileSync('netlify/functions/config.js', 'utf8');

code = code.replace(
  "        payshark_secret_key: '',",
  "        payshark_secret_key: '',\n        paysharkv2_api_key: '',\n        paysharkv2_transfer_key: '',"
);

code = code.replace(
  "        if (c.key === 'payshark_secret_key') result.payshark_secret_key = c.value;",
  "        if (c.key === 'payshark_secret_key') result.payshark_secret_key = c.value;\n        if (c.key === 'paysharkv2_api_key') result.paysharkv2_api_key = c.value;\n        if (c.key === 'paysharkv2_transfer_key') result.paysharkv2_transfer_key = c.value;"
);

code = code.replace(
  "        delete result.payshark_secret_key;",
  "        delete result.payshark_secret_key;\n        delete result.paysharkv2_api_key;\n        delete result.paysharkv2_transfer_key;"
);

code = code.replace(
  "        payshark_secret_key,",
  "        payshark_secret_key,\n        paysharkv2_api_key,\n        paysharkv2_transfer_key,"
);

code = code.replace(
  "      if (payshark_secret_key !== undefined) payloads.push({ key: 'payshark_secret_key', value: (payshark_secret_key || '').trim() });",
  "      if (payshark_secret_key !== undefined) payloads.push({ key: 'payshark_secret_key', value: (payshark_secret_key || '').trim() });\n      if (paysharkv2_api_key !== undefined) payloads.push({ key: 'paysharkv2_api_key', value: (paysharkv2_api_key || '').trim() });\n      if (paysharkv2_transfer_key !== undefined) payloads.push({ key: 'paysharkv2_transfer_key', value: (paysharkv2_transfer_key || '').trim() });"
);

fs.writeFileSync('netlify/functions/config.js', code);
console.log('Fixed config.js');
