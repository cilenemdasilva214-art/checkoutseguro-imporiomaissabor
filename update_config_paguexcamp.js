const fs = require('fs');
let code = fs.readFileSync('netlify/functions/config.js', 'utf8');

// 1. Add fields to default config
code = code.replace(
  "pagflex_webhook_secret: null",
  "pagflex_webhook_secret: null,\n        paguex_camp_public_key: null,\n        paguex_camp_secret_key: null"
);

// 2. Add to destructuring of body
code = code.replace(
  "pagflex_webhook_secret } = body;",
  "pagflex_webhook_secret, paguex_camp_public_key, paguex_camp_secret_key } = body;"
);

// 3. Add to updates object
code = code.replace(
  "if (pagflex_webhook_secret !== undefined) updates.pagflex_webhook_secret = pagflex_webhook_secret;",
  "if (pagflex_webhook_secret !== undefined) updates.pagflex_webhook_secret = pagflex_webhook_secret;\n      if (paguex_camp_public_key !== undefined) updates.paguex_camp_public_key = paguex_camp_public_key;\n      if (paguex_camp_secret_key !== undefined) updates.paguex_camp_secret_key = paguex_camp_secret_key;"
);

fs.writeFileSync('netlify/functions/config.js', code);
