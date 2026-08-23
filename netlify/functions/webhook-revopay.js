// Netlify Serverless Function: Webhook RevoPay
// Caminho: netlify/functions/webhook-revopay.js
const crypto = require('crypto');

function sha256(val) {
  if (!val) return null;
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

async function sendFacebookCapiEvent(dbRecord, eventName) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    const configUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/checkout_configs?select=*`;
    const configRes = await fetch(configUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!configRes.ok) return;
    const configs = await configRes.json();
    
    let facebookPixelId = '';
    let facebookPixelToken = '';
    let facebookPixelsJson = '';

    configs.forEach(c => {
      if (c.key === 'facebook_pixel_id') facebookPixelId = c.value;
      if (c.key === 'facebook_pixel_token') facebookPixelToken = c.value;
      if (c.key === 'facebook_pixels') facebookPixelsJson = c.value;
    });

    let pixels = [];
    if (facebookPixelsJson) {
      try {
        pixels = JSON.parse(facebookPixelsJson);
      } catch (e) {
        console.error('Erro ao fazer parse de facebook_pixels no webhook RevoPay:', e.message);
      }
    }

    if (pixels.length === 0 && facebookPixelId) {
      pixels.push({ id: facebookPixelId, token: facebookPixelToken });
    }

    if (pixels.length === 0) return;

    const userEmailHash = dbRecord.customer_email ? sha256(dbRecord.customer_email) : null;
    const userPhoneHash = dbRecord.customer_phone ? sha256(dbRecord.customer_phone.replace(/\D/g, '')) : null;
    const userCpfHash = dbRecord.customer_cpf ? sha256(dbRecord.customer_cpf.replace(/\D/g, '')) : null;

    const totalAmount = parseFloat(dbRecord.amount) || 0;

    for (const pixel of pixels) {
      if (!pixel.id || !pixel.token) continue;

      const capiUrl = `https://graph.facebook.com/v19.0/${pixel.id.trim()}/events?access_token=${pixel.token.trim()}`;

      const capiPayload = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: `revopay_${eventName}_${dbRecord.checkout_session_id || dbRecord.gateway_tx_id || dbRecord.id}_${Date.now()}`,
            event_source_url: dbRecord.domain ? `https://${dbRecord.domain}/checkout` : 'https://imporiomaissabor.com/checkout',
            action_source: 'website',
            user_data: {
              em: userEmailHash ? [userEmailHash] : undefined,
              ph: userPhoneHash ? [userPhoneHash] : undefined,
              external_id: userCpfHash ? [userCpfHash] : undefined,
            },
            custom_data: {
              currency: 'BRL',
              value: totalAmount,
            }
          }
        ]
      };

      console.log(`📡 Enviando CAPI '${eventName}' para Pixel ${pixel.id} via Webhook RevoPay...`);
      await fetch(capiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capiPayload)
      }).catch(e => console.error('Erro CAPI RevoPay:', e.message));
    }
  } catch (err) {
    console.error('❌ Falha ao enviar evento CAPI no Webhook RevoPay:', err.message);
  }
}

async function sendTrack7OrderEvent(dbRecord) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    const configUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/checkout_configs?select=*`;
    const configRes = await fetch(configUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!configRes.ok) return;
    const configs = await configRes.json();
    let track7ApiKey = process.env.TRACK7_API_KEY || '';
    configs.forEach(c => {
      if (c.key === 'track7_api_key' && c.value) track7ApiKey = c.value;
    });

    if (!track7ApiKey || !track7ApiKey.trim()) return;

    const track7TransactionId = (dbRecord.checkout_session_id || dbRecord.gateway_tx_id || dbRecord.id || ('tx-' + Date.now())).toString().substring(0, 100);
    const totalAmount = parseFloat(dbRecord.amount) || 0;

    let cleanDoc = (dbRecord.customer_cpf || '').replace(/\D/g, '');
    if (!cleanDoc) cleanDoc = '00000000000';

    let cleanPhone = (dbRecord.customer_phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) cleanPhone = '11999999999';

    let cleanZip = (dbRecord.cep || '').replace(/\D/g, '');
    if (cleanZip.length !== 8) cleanZip = '01001000';

    const items = Array.isArray(dbRecord.items) ? dbRecord.items : [];
    const track7Products = items.length > 0
      ? items.map(item => ({
          name: (item.name || item.title || 'Produto').substring(0, 120),
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat((parseFloat(item.price) || (totalAmount / (parseInt(item.quantity) || 1))).toFixed(2))
        }))
      : [{
          name: 'Pedido Checkout',
          quantity: 1,
          price: parseFloat(totalAmount.toFixed(2))
        }];

    const productsSum = parseFloat(track7Products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2));
    const finalTrack7Total = productsSum > 0 ? productsSum : parseFloat(totalAmount.toFixed(2));

    const track7Payload = {
      transaction_id: track7TransactionId,
      currency: 'BRL',
      customer: {
        name: dbRecord.customer_name || 'Cliente',
        email: dbRecord.customer_email || 'cliente@email.com',
        phone: cleanPhone,
        document: cleanDoc
      },
      address: {
        street: (dbRecord.street || 'Rua não informada').trim(),
        number: (dbRecord.street_number || 'S/N').trim(),
        complement: (dbRecord.complement || '').trim(),
        neighborhood: (dbRecord.neighborhood || 'Bairro não informado').trim(),
        city: (dbRecord.city || 'São Paulo').trim(),
        state: (dbRecord.state || 'SP').trim().toUpperCase().substring(0, 2),
        zipcode: cleanZip
      },
      products: track7Products,
      total: finalTrack7Total
    };

    console.log(`🚚 Webhook RevoPay: Enviando pedido PAGO (${track7TransactionId}) para a Track7...`);
    await fetch('https://track7.app/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': track7ApiKey.trim()
      },
      body: JSON.stringify(track7Payload)
    }).catch(e => console.error('Erro Track7 RevoPay:', e.message));
  } catch (err) {
    console.error('❌ Erro no envio do evento Track7 via Webhook RevoPay:', err.message);
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({ message: 'Successful preflight' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("⚠️ Supabase não configurado para o Webhook RevoPay.");
      return { statusCode: 500, body: JSON.stringify({ error: 'Configuração do banco ausente.' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    console.log('📡 Webhook RevoPay recebido:', JSON.stringify(payload));
    console.log('📋 Webhook RevoPay Headers:', JSON.stringify(event.headers));

    const dataObj = payload.data || payload;
    const eventType = (payload.type || payload.event || '').toString().toUpperCase();

    const transactionId = dataObj.id || dataObj.transactionId || payload.objectId || payload.id;
    const externalRef = dataObj.externalRef || payload.externalRef || dataObj.postbackUrl;

    if (!transactionId && !externalRef) {
      console.warn("⚠️ Webhook RevoPay sem ID de transação ou externalRef.");
      return { statusCode: 400, body: JSON.stringify({ error: 'Identificador de transação não encontrado.' }) };
    }

    const rawStatus = (dataObj.status || payload.status || eventType || '').toString().toUpperCase();
    console.log(`ℹ️ Status bruto recebido da RevoPay: ${rawStatus} (Type: ${eventType})`);

    let newStatus = 'pendente';
    if (['PAID', 'APPROVED', 'CONFIRMED', 'PAGO', 'APROVADO', 'SUCCESS', 'TRANSACTION.PAID'].some(s => rawStatus.includes(s))) {
      newStatus = 'pago';
    } else if (['REFUSED', 'CANCELED', 'CANCELLED', 'DECLINED', 'RECUSADO', 'CANCELADO', 'FAILED', 'EXPIRED', 'TRANSACTION.FAILED'].some(s => rawStatus.includes(s))) {
      newStatus = 'recusado';
    } else if (['REFUNDED', 'CHARGEBACK', 'ESTORNADO', 'TRANSACTION.REFUNDED', 'TRANSACTION.CHARGEBACK'].some(s => rawStatus.includes(s))) {
      newStatus = 'estornado';
    }

    let targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/card_checkout_test_raw`;
    if (transactionId) {
      targetUrl += `?gateway_tx_id=eq.${encodeURIComponent(transactionId)}`;
    } else if (externalRef) {
      targetUrl += `?checkout_session_id=eq.${encodeURIComponent(externalRef)}`;
    }

    const updatePayload = {
      status: newStatus,
      admin_notes: `[Webhook RevoPay] Atualizado em ${new Date().toLocaleString('pt-BR')}. Status: ${rawStatus} -> ${newStatus}. Payload: ${JSON.stringify(payload)}`
    };

    const updateRes = await fetch(targetUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Erro ao atualizar Supabase: ${updateRes.status} - ${errText}`);
    }

    const updatedRows = await updateRes.json();
    const dbRecord = (Array.isArray(updatedRows) && updatedRows.length > 0) ? updatedRows[0] : null;

    console.log(`✅ Webhook RevoPay processado com sucesso. Registros afetados: ${updatedRows.length}`);

    if (newStatus === 'pago' && dbRecord) {
      await sendFacebookCapiEvent(dbRecord, 'Purchase').catch(e => console.error('Erro CAPI via Webhook RevoPay:', e.message));
      await sendTrack7OrderEvent(dbRecord).catch(e => console.error('Erro Track7 via Webhook RevoPay:', e.message));
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true, message: 'Webhook RevoPay processado com sucesso' })
    };
  } catch (err) {
    console.error('❌ Erro no Webhook RevoPay:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
