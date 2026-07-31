// Netlify Serverless Function: Webhook Payshark V2
// Caminho: netlify/functions/webhook-paysharkv2.js
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
        console.error('Erro ao fazer parse de facebook_pixels no webhook:', e.message);
      }
    }

    if (pixels.length === 0 && facebookPixelId) {
      pixels.push({ id: facebookPixelId, token: facebookPixelToken });
    }

    const capiPixels = pixels.filter(p => p.id && p.token);
    if (capiPixels.length === 0) return;

    const nameParts = (dbRecord.customer_name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const email = dbRecord.customer_email || '';
    const phone = (dbRecord.customer_phone || '').replace(/\D/g, '');

    const userData = {
      em: email ? [sha256(email)] : [],
      ph: phone ? [sha256(phone)] : [],
      fn: firstName ? [sha256(firstName)] : [],
      ln: lastName ? [sha256(lastName)] : []
    };

    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = dbRecord.checkout_session_id || dbRecord.id || `tx-${dbRecord.gateway_tx_id}`;
    const sourceUrl = dbRecord.origin || 'https://checkoutseguro-imporiomaissabor.netlify.app';

    for (const pixel of capiPixels) {
      const capiUrl = `https://graph.facebook.com/v19.0/${pixel.id}/events?access_token=${pixel.token}`;
      const payload = {
        data: [
          {
            event_name: eventName,
            event_time: eventTime,
            event_id: eventId,
            event_source_url: sourceUrl,
            action_source: 'website',
            user_data: userData,
            custom_data: {
              currency: 'BRL',
              value: parseFloat(dbRecord.amount) || 0
            }
          }
        ]
      };

      console.log(`📡 Enviando CAPI '${eventName}' via Webhook para Pixel ${pixel.id}...`);
      await fetch(capiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  } catch (err) {
    console.error('❌ Falha ao enviar evento CAPI no Webhook Payshark V2:', err.message);
  }
}

exports.handler = async (event, context) => {
  // CORS Preflight
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

  // Apenas aceita POST
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
      console.warn("Variáveis do Supabase não configuradas para o webhook.");
      return { statusCode: 500, body: JSON.stringify({ error: 'Configuração ausente.' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    console.log('Webhook Payshark V2 recebido:', JSON.stringify(payload));

    const transactionId = payload.id || payload.transactionId || payload.externalRef || payload.paymentId;
    
    if (!transactionId) {
      console.warn("Webhook sem ID de transação detectado.");
      return { statusCode: 400, body: JSON.stringify({ error: 'ID da transação não encontrado no payload' }) };
    }

    const statusStr = (payload.status || payload.state || '').toString().toUpperCase();
    
    let newStatus = 'pendente';
    if (['PAID', 'APPROVED', 'CONFIRMED', 'PAGO', 'APROVADO'].includes(statusStr)) {
      newStatus = 'pago';
    } else if (['REFUSED', 'CANCELED', 'CANCELLED', 'DECLINED', 'RECUSADO', 'CANCELADO'].includes(statusStr)) {
      newStatus = 'recusado';
    } else if (['REFUNDED', 'CHARGEBACK', 'ESTORNADO'].includes(statusStr)) {
      newStatus = 'estornado';
    }

    const targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/card_checkout_test_raw?gateway_tx_id=eq.${encodeURIComponent(transactionId)}`;
    
    const updatePayload = {
      status: newStatus,
      admin_notes: `[Webhook Payshark V2] Atualizado em ${new Date().toLocaleString('pt-BR')}. Payload: ${JSON.stringify(payload)}`
    };

    const response = await fetch(targetUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updatePayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase erro: ${response.status} - ${errText}`);
    }

    const updatedRows = await response.json();
    console.log(`Webhook processado com sucesso. Pedido ${transactionId} -> ${newStatus}`);
    
    if (newStatus === 'pago' && Array.isArray(updatedRows) && updatedRows.length > 0) {
      await sendFacebookCapiEvent(updatedRows[0], 'Purchase').catch(e => console.error('Erro CAPI:', e.message));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Webhook recebido e processado' })
    };

  } catch (err) {
    console.error('Erro ao processar Webhook Payshark V2:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
