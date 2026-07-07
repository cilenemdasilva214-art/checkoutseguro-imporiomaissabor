const fs = require('fs');
let code = fs.readFileSync('netlify/functions/checkout.js', 'utf8');

// 1. Add variable declarations
code = code.replace(
  "    let PAYSHARK_SECRET_KEY = process.env.PAYSHARK_SECRET_KEY || '';",
  "    let PAYSHARK_SECRET_KEY = process.env.PAYSHARK_SECRET_KEY || '';\n    let PAYSHARKV2_API_KEY = process.env.PAYSHARKV2_API_KEY || '';"
);

// 2. Read from DB config
code = code.replace(
  "            if (c.key === 'payshark_secret_key' && c.value) PAYSHARK_SECRET_KEY = c.value;",
  "            if (c.key === 'payshark_secret_key' && c.value) PAYSHARK_SECRET_KEY = c.value;\n            if (c.key === 'paysharkv2_api_key' && c.value) PAYSHARKV2_API_KEY = c.value;"
);

// 3. Insert Payshark V2 block before PagFlexBR
const pagflexAnchor = "      } else if (ACTIVE_GATEWAY === 'pagflexbr') {";
const paysharkV2Block =       } else if (ACTIVE_GATEWAY === 'paysharkv2') {
        try {
          console.log('? Iniciando integração de Pix com a Payshark V2...');
          const paysharkV2Url = 'https://api.gatewaypayshark.com.br/v1/payment';
          const authHeader = 'Bearer ' + PAYSHARKV2_API_KEY;
          
          const amountCents = Math.round(totalAmount * 100);
          
          // Fallback para campos obrigatórios
          const cpfPayer = (data.customer_cpf || '').replace(/\\D/g, '') || '00000000000';
          const phonePayer = (data.customer_phone || '').replace(/\\D/g, '') || '11999999999';
          const emailPayer = data.customer_email || 'cliente@exemplo.com';
          const namePayer = data.customer_name || 'Cliente Sem Nome';

          const itemsPayload = (data.items && data.items.length > 0) ? data.items.map(item => ({
            quantity: parseInt(item.quantity) || 1,
            name: item.name || 'Produto',
            price: Math.round(parseFloat(item.price) * 100),
            type: "PHYSICAL"
          })) : [
            {
              quantity: 1,
              name: "Pedido",
              price: amountCents,
              type: "PHYSICAL"
            }
          ];

          const payload = {
            amount: amountCents,
            currency: "BRL",
            method: "PIX",
            description: "Pedido na loja",
            externalRef: "order_" + Math.random().toString(36).substr(2, 9),
            notificationUrl: "https://checkoutseguro-imporiomaissabor.netlify.app/.netlify/functions/webhook-paysharkv2",
            payer: {
              name: namePayer,
              taxId: cpfPayer,
              email: emailPayer,
              phone: phonePayer
            },
            items: itemsPayload
          };

          const paysharkV2Res = await fetch(paysharkV2Url, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const resData = await paysharkV2Res.json();
          
          if (!paysharkV2Res.ok) {
            throw new Error(\Erro Payshark V2: \\);
          }

          transactionId = resData.id || resData.transactionId || payload.externalRef;
          
          // Extração segura do QR Code (A API pode variar um pouco a resposta)
          pixQrCode = (resData.pix && (resData.pix.qr_code || resData.pix.qrcode || resData.pix.copiaecola || resData.pix.code || resData.pix.copyAndPaste)) 
                     || resData.qrcode || resData.qrCode || resData.qr_code || resData.copyAndPaste || resData.copiaCola || resData.copiaecola || resData.code;
          
          if (!pixQrCode) {
            console.warn('QR Code não encontrado na resposta Payshark V2. Resposta foi:', resData);
          }
          
        } catch (err) {
          console.error('? Erro na integração Pix Payshark V2:', err);
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              error: 'Erro na geração do PIX (Payshark V2)',
              error_details: err.message
            }),
          };
        }
;
code = code.replace(pagflexAnchor, paysharkV2Block + pagflexAnchor);

// 4. Update logging ternary conditions
code = code.replace(
  "ACTIVE_GATEWAY === 'payshark' ? 'PayShark' : 'PagueX'",
  "ACTIVE_GATEWAY === 'payshark' ? 'PayShark' : (ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2' : 'PagueX')"
);

code = code.replace(
  "ACTIVE_GATEWAY === 'payshark' ? 'PayShark Pix' : 'PagueX Pix'",
  "ACTIVE_GATEWAY === 'payshark' ? 'PayShark Pix' : (ACTIVE_GATEWAY === 'paysharkv2' ? 'Payshark V2 Pix' : 'PagueX Pix')"
);

fs.writeFileSync('netlify/functions/checkout.js', code);
console.log('Fixed checkout.js');
