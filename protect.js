const fs = require('fs');

function protectEndpoint(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('auth-middleware')) return; // Already protected

  const importStatement = "const { verifyToken } = require('./auth-middleware');\n";
  const protectionLogic = "  if (event.httpMethod !== 'OPTIONS') {\n    if (!verifyToken(event)) {\n      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };\n    }\n  }\n";

  // Find the start of exports.handler
  content = importStatement + content.replace(/exports\.handler\s*=\s*async\s*\(event,\s*context\)\s*=>\s*\{/, "exports.handler = async (event, context) => {\n" + protectionLogic);
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Protected:', file);
}

protectEndpoint('netlify/functions/orders.js');
protectEndpoint('netlify/functions/config.js');
protectEndpoint('netlify/functions/marketing.js');
protectEndpoint('netlify/functions/shopify.js');
protectEndpoint('netlify/functions/woocommerce.js');
