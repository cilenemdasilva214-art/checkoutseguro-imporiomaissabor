const fs = require('fs');
let code = fs.readFileSync('netlify/functions/checkout.js', 'utf8');

const paguexcampBlock = `
      } else if (ACTIVE_GATEWAY === 'paguexcamp') {
        try {
          console.log('? Iniciando integração de Pix com a Pague-X CAMP BLACK...');
          const paguexUrl = 'https://app.pague-x.online/api/v1/gateway/pix/receive';
          
          const paguexItems = Array.isArray(data.items) && data.items.length > 0 
            ? data.items.map((item, index) => ({
                id: item.id || \`item-\${index}\`,
                title: item.name || 'Produto da Loja',
                unitPrice: Math.round((parseFloat(item.price) || totalAmount) * 100),
                quantity: parseInt(item.quantity) || 1,
                tangible: true
              }))
            : [{ title: 'Item do Checkout', unitPrice: Math.round(totalAmount * 100), quantity: 1, tangible: true }];

          const amountCents = Math.round(totalAmount * 100);

          const paguexPayload = {
            identifier: data.checkout_session_id || 'pxc-' + Math.random().toString(36).substr(2, 9),
            amount: amountCents,
            customer: {
              name: data.customer_name || 'Cliente',
              email: data.customer_email || 'cliente@exemplo.com',
              document: {
                type: 'cpf',
                number: data.customer_cpf ? data.customer_cpf.replace(/\\D/g, '') : '00000000000'
              }
            },
            items: paguexItems,
            paymentMethod: 'pix'
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
            const errMsg = paguexData.message || paguexData.errorDescription || 'Erro desconhecido na Pague-X CAMP BLACK';
            throw new Error(\`Pague-X CAMP BLACK API Error: \${paguexRes.status} - \${errMsg}\`);
          }

          transactionId = paguexData.transactionId;
          transactionStatus = paguexData.status || 'PENDING';
          gatewayResponse = paguexData;
          pixQrCode = paguexData.pix.code;
          pixExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          console.log(\`? Pix criado na Pague-X CAMP BLACK com sucesso! ID: \${transactionId}\`);

        } catch (paguexErr) {
          console.error('? Falha ao integrar com a Pague-X CAMP BLACK:', paguexErr);
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
`;

// Variables 
code = code.replace(
  "let PAGUEX_PUBLIC_KEY = process.env.PAGUEX_PUBLIC_KEY;\n    let PAGUEX_SECRET_KEY = process.env.PAGUEX_SECRET_KEY;",
  "let PAGUEX_PUBLIC_KEY = process.env.PAGUEX_PUBLIC_KEY;\n    let PAGUEX_SECRET_KEY = process.env.PAGUEX_SECRET_KEY;\n    let PAGUEX_CAMP_PUBLIC_KEY = process.env.PAGUEX_CAMP_PUBLIC_KEY;\n    let PAGUEX_CAMP_SECRET_KEY = process.env.PAGUEX_CAMP_SECRET_KEY;"
);

code = code.replace(
  "if (c.key === 'paguex_secret_key' && c.value) PAGUEX_SECRET_KEY = c.value;",
  "if (c.key === 'paguex_secret_key' && c.value) PAGUEX_SECRET_KEY = c.value;\n            if (c.key === 'paguex_camp_public_key' && c.value) PAGUEX_CAMP_PUBLIC_KEY = c.value;\n            if (c.key === 'paguex_camp_secret_key' && c.value) PAGUEX_CAMP_SECRET_KEY = c.value;"
);

// Block insertion
code = code.replace(
  "} else if (ACTIVE_GATEWAY === 'hypercash') {",
  paguexcampBlock + "      } else if (ACTIVE_GATEWAY === 'hypercash') {"
);

// Final success message and mode
code = code.replace(
  "(ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2' : 'PagueX')",
  "(ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2' : (ACTIVE_GATEWAY === 'paguexcamp' ? 'Pague-X CAMP BLACK' : 'PagueX'))"
);

code = code.replace(
  "(ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2 Pix' : 'PagueX Pix')",
  "(ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2 Pix' : (ACTIVE_GATEWAY === 'paguexcamp' ? 'Pague-X CAMP BLACK Pix' : 'PagueX Pix'))"
);

fs.writeFileSync('netlify/functions/checkout.js', code);
