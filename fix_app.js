const fs = require('fs');
let code = fs.readFileSync('js/app.js', 'utf8');

const targetBlock = "            if (!storeParam || storeParam === 'null' || storeParam === 'undefined') {\n              if (window._currentThemeConfig && window._currentThemeConfig.shopifyDomain) {\n                let domain = window._currentThemeConfig.shopifyDomain.trim();\n                if (!domain.includes('.')) {\n                  domain = domain + '.myshopify.com';\n                }\n                storeParam = 'https://' + domain;\n              }\n            }";

const replacementBlock = "            if (!storeParam || storeParam === 'null' || storeParam === 'undefined' || storeParam === 'woocommerce') {\n              if (window._currentThemeConfig && window._currentThemeConfig.wooCommerceDomain) {\n                storeParam = 'https://' + window._currentThemeConfig.wooCommerceDomain.trim();\n              } else if (window._currentThemeConfig && window._currentThemeConfig.shopifyDomain) {\n                let domain = window._currentThemeConfig.shopifyDomain.trim();\n                if (!domain.includes('.')) {\n                  domain = domain + '.myshopify.com';\n                }\n                storeParam = 'https://' + domain;\n              } else {\n                storeParam = '';\n              }\n            }";

code = code.replace(/\r\n/g, '\n');

if (code.includes(targetBlock)) {
  code = code.replace(targetBlock, replacementBlock);
  fs.writeFileSync('js/app.js', code);
  console.log('Fixed js/app.js');
} else {
  console.log('Could not find target block in js/app.js');
}
