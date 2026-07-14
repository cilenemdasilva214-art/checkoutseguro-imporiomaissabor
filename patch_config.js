const fs = require('fs');
let code = fs.readFileSync('netlify/functions/config.js', 'utf8');

// 1. Initial defaults
code = code.replace(
  "pagflex_webhook_secret: ''",
  "pagflex_webhook_secret: '',\n        paguex_camp_public_key: '',\n        paguex_camp_secret_key: ''"
);

// 2. Hydration
code = code.replace(
  "if (c.key === 'pagflex_webhook_secret') result.pagflex_webhook_secret = c.value;",
  "if (c.key === 'pagflex_webhook_secret') result.pagflex_webhook_secret = c.value;\n        if (c.key === 'paguex_camp_public_key') result.paguex_camp_public_key = c.value;\n        if (c.key === 'paguex_camp_secret_key') result.paguex_camp_secret_key = c.value;"
);

// 3. Security (masking)
code = code.replace(
  "delete result.pagflex_webhook_secret;",
  "delete result.pagflex_webhook_secret;\n        delete result.paguex_camp_secret_key;"
);

// 4. Destructuring incoming body
code = code.replace(
  "pagflex_webhook_secret\n      } = data;",
  "pagflex_webhook_secret,\n        paguex_camp_public_key,\n        paguex_camp_secret_key\n      } = data;"
);

// 5. Update payload building
code = code.replace(
  "if (pagflex_webhook_secret !== undefined) payloads.push({ key: 'pagflex_webhook_secret', value: (pagflex_webhook_secret || '').trim() });",
  "if (pagflex_webhook_secret !== undefined) payloads.push({ key: 'pagflex_webhook_secret', value: (pagflex_webhook_secret || '').trim() });\n      if (paguex_camp_public_key !== undefined) payloads.push({ key: 'paguex_camp_public_key', value: (paguex_camp_public_key || '').trim() });\n      if (paguex_camp_secret_key !== undefined) payloads.push({ key: 'paguex_camp_secret_key', value: (paguex_camp_secret_key || '').trim() });"
);

fs.writeFileSync('netlify/functions/config.js', code);
