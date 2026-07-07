const fs = require('fs');

let checkoutJs = fs.readFileSync('netlify/functions/checkout.js', 'utf8');

const validationFunc = 
async function validatePricesWithShopify(items, storeDomain, accessToken) {
  if (!storeDomain || !accessToken) return items; // Fallback se não tiver config
  
  let validItems = [];
  for (let item of items) {
    if (item.shopify_variant_id) {
       try {
         const url = \https://\/admin/api/2024-01/variants/\.json\;
         const response = await fetch(url, {
           headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
         });
         if (response.ok) {
           const variantData = await response.json();
           item.price = parseFloat(variantData.variant.price);
           console.log(\Preço real buscado na Shopify para variante \: \\);
         }
       } catch (e) {
         console.error('Erro ao validar preço na Shopify', e);
       }
    }
    validItems.push(item);
  }
  return validItems;
}
;

if (!checkoutJs.includes('validatePricesWithShopify')) {
    // Insert function before exports.handler
    checkoutJs = checkoutJs.replace("exports.handler = async (event, context) => {", validationFunc + "\nexports.handler = async (event, context) => {");
}

// Inside the handler, we need to find where data is parsed and add the validation logic.
// The current logic has:
// const data = JSON.parse(event.body);
// ...
// let totalAmount = parseFloat(data.amount) || 0;

const overrideLogic = 
    const { storeDomain, accessToken } = await resolveShopifyCredentials();
    
    // ANTI-FRAUD: Validate prices via Shopify
    let itemsArr = Array.isArray(data.items) ? data.items : [];
    if (itemsArr.length > 0) {
      itemsArr = await validatePricesWithShopify(itemsArr, storeDomain, accessToken);
      data.items = itemsArr;
      
      let realItemsTotal = itemsArr.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
      let shippingPrice = parseFloat(data.shipping_price) || 0;
      let couponDiscount = parseFloat(data.coupon_discount) || 0;
      
      let realTotal = realItemsTotal + shippingPrice - couponDiscount;
      if (realTotal < 0) realTotal = 0;
      
      let frontendAmount = parseFloat(data.amount) || 0;
      
      // Override the total amount if there is a mismatch (prevent price tampering)
      if (Math.abs(realTotal - frontendAmount) > 0.02) { // 2 cents tolerance for float rounding
          console.warn(\ANTI-FRAUD: Discrepância de preço detectada! Frontend enviou \, mas o valor real é \\);
          data.amount = realTotal;
      }
    }
;

// Inject right after JSON parse
if (!checkoutJs.includes('// ANTI-FRAUD: Validate prices via Shopify')) {
    checkoutJs = checkoutJs.replace("const data = JSON.parse(event.body);", "const data = JSON.parse(event.body);\n" + overrideLogic);
}

fs.writeFileSync('netlify/functions/checkout.js', checkoutJs, 'utf8');
console.log('checkout.js patched with price validation!');
