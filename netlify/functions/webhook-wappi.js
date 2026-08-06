// Netlify Serverless Function: Webhook Wappi Brasil
// Caminho: netlify/functions/webhook-wappi.js
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
        console.error('Erro ao fazer parse de facebook_pixels no webhook Wappi:', e.message);
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
    const userAgent = dbRecord.user_agent || '';

    const userData = {
      em: email ? [sha256(email)] : [],
      ph: phone ? [sha256(phone)] : [],
      fn: firstName ? [sha256(firstName)] : [],
      ln: lastName ? [sha256(lastName)] : []
    };

    if (userAgent) userData.client_user_agent = userAgent;
    if (dbRecord.fbp) userData.fbp = dbRecord.fbp;
    if (dbRecord.fbc) userData.fbc = dbRecord.fbc;

    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = dbRecord.checkout_session_id || dbRecord.id || `tx-${dbRecord.gateway_tx_id}`;
    const sourceUrl = dbRecord.origin || 'https://comprasegura-imporiomaissabor.netlify.app';

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

      console.log(`📡 Enviando CAPI '${eventName}' via Webhook Wappi para Pixel ${pixel.id}...`);
      await fetch(capiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  } catch (err) {
    console.error('❌ Falha ao enviar evento CAPI no Webhook Wappi:', err.message);
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
      console.warn("⚠️ Supabase não configurado para o Webhook Wappi.");
      return { statusCode: 500, body: JSON.stringify({ error: 'Configuração do banco ausente.' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    console.log('📡 Webhook Wappi recebido:', JSON.stringify(payload));

    const dataObj = payload.data || payload;
    const eventType = (payload.event || payload.type || '').toString().toUpperCase();

    const transactionId = dataObj.id || dataObj.transactionId || payload.objectId || payload.id;
    const externalRef = dataObj.externalRef || payload.externalRef;

    if (!transactionId && !externalRef) {
      console.warn("⚠️ Webhook Wappi sem ID de transação ou externalRef.");
      return { statusCode: 400, body: JSON.stringify({ error: 'Identificador de transação não encontrado.' }) };
    }

    // Mapeamento de Status
    const rawStatus = (dataObj.status || payload.status || eventType || '').toString().toUpperCase();
    console.log(`ℹ️ Status bruto recebido da Wappi: ${rawStatus} (Event: ${eventType})`);

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
      admin_notes: `[Webhook Wappi] Atualizado em ${new Date().toLocaleString('pt-BR')}. Status: ${rawStatus} -> ${newStatus}. Payload: ${JSON.stringify(payload)}`
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
    console.log(`✅ Webhook Wappi processado com sucesso. Registros afetados: ${updatedRows.length}`);

    // Disparar CAPI se o status for PAGO / APROVADO
    if (newStatus === 'pago' && Array.isArray(updatedRows) && updatedRows.length > 0) {
      const dbRecord = updatedRows[0];
      await sendFacebookCapiEvent(dbRecord, 'Purchase').catch(e => console.error('Erro ao enviar CAPI via Webhook Wappi:', e.message));
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Webhook Wappi processado com sucesso' })
    };

  } catch (err) {
    console.error('❌ Erro no Webhook Wappi:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
