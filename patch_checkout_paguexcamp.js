const fs = require('fs');
let code = fs.readFileSync('netlify/functions/checkout.js', 'utf8');

// 1. Keys definition
code = code.replace(
  "let PAGUEX_PUBLIC_KEY = process.env.PAGUEX_PUBLIC_KEY;\n    let PAGUEX_SECRET_KEY = process.env.PAGUEX_SECRET_KEY;",
  "let PAGUEX_PUBLIC_KEY = process.env.PAGUEX_PUBLIC_KEY;\n    let PAGUEX_SECRET_KEY = process.env.PAGUEX_SECRET_KEY;\n    let PAGUEX_CAMP_PUBLIC_KEY = process.env.PAGUEX_CAMP_PUBLIC_KEY;\n    let PAGUEX_CAMP_SECRET_KEY = process.env.PAGUEX_CAMP_SECRET_KEY;"
);

// 2. Load from config DB
code = code.replace(
  "if (c.key === 'paguex_secret_key' && c.value) PAGUEX_SECRET_KEY = c.value;",
  "if (c.key === 'paguex_secret_key' && c.value) PAGUEX_SECRET_KEY = c.value;\n            if (c.key === 'paguex_camp_public_key' && c.value) PAGUEX_CAMP_PUBLIC_KEY = c.value;\n            if (c.key === 'paguex_camp_secret_key' && c.value) PAGUEX_CAMP_SECRET_KEY = c.value;"
);

// 3. Clone Pix block
const paguexcampBlock = 
      } else if (ACTIVE_GATEWAY === 'paguexcamp') {
        try {
          console.log('? Iniciando integração de Pix com a Pague-X CAMP BLACK...');
          const paguexUrl = 'https://app.pague-x.online/api/v1/gateway/pix/receive';
          
          // Montar itens no formato exigido
          const paguexItems = Array.isArray(data.items) && data.items.length > 0 
            ? data.items.map((item, index) => ({
                id: item.id || \item-\\,
                title: item.name || 'Produto da Loja',
                unitPrice: parseFloat(item.price) || totalAmount,
                quantity: parseInt(item.quantity) || 1,
                tangible: true
              }))
            : [{ id: 'item-0', title: 'Pedido Geral', unitPrice: totalAmount, quantity: 1, tangible: true }];

          const productsSum = paguexItems.reduce((sum, item) => sum + (parseFloat(item.unitPrice) * parseInt(item.quantity)), 0);
          let extraFee = 0;
          if (totalAmount > productsSum) {
             extraFee = totalAmount - productsSum;
          }

          const paguexPayload = {
            identifier: data.checkout_session_id || 'pxc-' + Math.random().toString(36).substr(2, 9),
            amount: totalAmount,
            payer: {
              firstName: nameParts[0],
              lastName: nameParts.slice(1).join(' ') || 'Cliente',
              email: data.customer_email || 'cliente@exemplo.com',
              document: data.customer_cpf ? data.customer_cpf.replace(/\\D/g, '') : '00000000000',
              phone: data.customer_phone ? data.customer_phone.replace(/\\D/g, '') : '11999999999'
            },
            products: paguexItems,
            metadata: {
              checkout_session_id: data.checkout_session_id || 'no-session-id',
            }
          };

          const paguexRes = await fetch(paguexUrl, {
            method: 'POST',
            headers: {
              'x-public-key': PAGUEX_CAMP_PUBLIC_KEY,
              'x-secret-key': PAGUEX_CAMP_SECRET_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(paguexPayload)
          });

          const paguexData = await paguexRes.json();

          if (!paguexRes.ok) {
            const errMsg = paguexData.message || paguexData.errorDescription || 'Erro desconhecido na PagueX CAMP BLACK';
            throw new Error(\PagueX CAMP BLACK API Error: \ - \\);
          }

          transactionId = paguexData.transactionId;
          transactionStatus = paguexData.status || 'PENDING';
          gatewayResponse = paguexData;
          pixQrCode = paguexData.pix.code;
          pixExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          console.log(\? Pix criado na PagueX CAMP BLACK com sucesso! ID: \\);

        } catch (paguexErr) {
          console.error('? Falha ao integrar com a PagueX CAMP BLACK:', paguexErr);
          isMock = true;
          transactionId = 'mock-paguexcamp-id-' + Math.random().toString(36).substr(2, 9);
          transactionStatus = 'PENDING';
          pixQrCode = '00020101021126950014br.gov.bcb.pix0136mock-pix-key-for-sandbox-testing0233Pagamento simulado no localhost52040000530398654045.005802BR5915Antigravity Mock6009Sao Paulo62070503***6304E8A2';
          pixExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          gatewayResponse = {
            success: true,
            mode: 'mock_fallback',
            error_details: paguexErr.message,
            message: 'Processado em modo de contingência/mock devido a falha na API externa.'
          };
        }
;

// Find where "else if (ACTIVE_GATEWAY === 'payshark') {" begins (around line 213 usually, wait, where does paguex end?)
// It's safer to append it before "else if (ACTIVE_GATEWAY === 'hypercash')"
code = code.replace(
  "} else if (ACTIVE_GATEWAY === 'hypercash') {",
  paguexcampBlock + "\n      } else if (ACTIVE_GATEWAY === 'hypercash') {"
);

// 4. Update Success message string
code = code.replace(
  "(ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2' : 'PagueX')",
  "(ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2' : (ACTIVE_GATEWAY === 'paguexcamp' ? 'Pague-X CAMP BLACK' : 'PagueX'))"
);

// 5. Update gateway name
code = code.replace(
  "(ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2 Pix' : 'PagueX Pix')",
  "(ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2 Pix' : (ACTIVE_GATEWAY === 'paguexcamp' ? 'Pague-X CAMP BLACK Pix' : 'PagueX Pix'))"
);

fs.writeFileSync('netlify/functions/checkout.js', code);
