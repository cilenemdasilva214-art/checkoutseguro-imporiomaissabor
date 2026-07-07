const fs = require('fs');
let code = fs.readFileSync('netlify/functions/config.js', 'utf8');

const authCheck = "  if (event.httpMethod !== 'OPTIONS') {\n    if (!verifyToken(event)) {\n      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };\n    }\n  }";

const newAuthCheck = "  const isAdmin = !!verifyToken(event);\n  if (event.httpMethod !== 'OPTIONS' && event.httpMethod !== 'GET') {\n    if (!isAdmin) {\n      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };\n    }\n  }";

const returnBlock = "      return {\n        statusCode: 200,\n        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },\n        body: JSON.stringify(result),\n      };";

const newReturnBlock = "      if (!isAdmin) {\n        delete result.admin_username;\n        delete result.admin_password;\n        delete result.paguex_secret_key;\n        delete result.hypercash_secret_key;\n        delete result.payshark_secret_key;\n        delete result.pagflex_transfer_key;\n        delete result.pagflex_webhook_secret;\n      }\n\n      return {\n        statusCode: 200,\n        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },\n        body: JSON.stringify(result),\n      };";

code = code.replace(/\r\n/g, '\n');

if (code.includes(authCheck)) {
  code = code.replace(authCheck, newAuthCheck);
} else {
  console.log("Could not find authCheck block.");
}

if (code.includes(returnBlock)) {
  code = code.replace(returnBlock, newReturnBlock);
} else {
  console.log("Could not find returnBlock block.");
}

fs.writeFileSync('netlify/functions/config.js', code);
console.log('Fixed netlify/functions/config.js');
