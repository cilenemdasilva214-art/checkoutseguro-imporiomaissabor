// Netlify Serverless Function: Webhook Blackcat
// Caminho: netlify/functions/webhook-blackcat.js
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
    if (capiPixels.length === 0) {
      console.log('ℹ️ Nenhum Pixel com token Conversions API ativo. CAPI ignorado.');
      return;
    }

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

      console.log(`📡 Enviando CAPI '${eventName}' para Pixel ${pixel.id}...`);
      const response = await fetch(capiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resJson = await response.json();
      console.log(`✅ CAPI Resposta para Pixel ${pixel.id}:`, JSON.stringify(resJson));
    }
  } catch (err) {
    console.error('❌ Falha ao enviar evento CAPI no Webhook:', err.message);
  }
}

exports.handler = async (event, context) => {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({ message: 'Successful preflight' }),
    };
  }

  // Apenas aceita POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("⚠️ Variáveis do Supabase não configuradas para o webhook Blackcat.");
      return { statusCode: 500, body: JSON.stringify({ error: 'Configuração ausente.' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    console.log('📡 Webhook Blackcat recebido:', JSON.stringify(payload));

    const dataObj = payload.data || payload.transaction || payload;
    const transactionId = dataObj.transactionId || dataObj.id || payload.transactionId || payload.id;
    const externalRef = dataObj.externalRef || payload.externalRef || dataObj.reference;

    if (!transactionId && !externalRef) {
      console.warn("⚠️ Webhook sem ID de transação ou externalRef.");
      return { statusCode: 400, body: JSON.stringify({ error: 'Identificador de transação não encontrado.' }) };
    }

    // Mapeamento do Status
    const rawStatus = (dataObj.status || payload.status || '').toString().toUpperCase();
    console.log(`ℹ️ Status bruto recebido da Blackcat: ${rawStatus}`);

    let newStatus = 'pendente';
    if (['PAID', 'APPROVED', 'CONFIRMED', 'PAGO', 'APROVADO', 'SUCCESS'].includes(rawStatus)) {
      newStatus = 'pago';
    } else if (['REFUSED', 'CANCELED', 'CANCELLED', 'DECLINED', 'RECUSADO', 'CANCELADO', 'FAILED', 'EXPIRED'].includes(rawStatus)) {
      newStatus = 'recusado';
    } else if (['REFUNDED', 'CHARGEBACK', 'ESTORNADO'].includes(rawStatus)) {
      newStatus = 'estornado';
    }

    // Tentar atualizar por gateway_tx_id primeiro, ou por checkout_session_id
    let targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/card_checkout_test_raw`;
    if (transactionId) {
      targetUrl += `?gateway_tx_id=eq.${encodeURIComponent(transactionId)}`;
    } else if (externalRef) {
      targetUrl += `?checkout_session_id=eq.${encodeURIComponent(externalRef)}`;
    }

    const updatePayload = {
      status: newStatus,
      admin_notes: `[Webhook Blackcat] Atualizado em ${new Date().toLocaleString('pt-BR')}. Status: ${rawStatus} -> ${newStatus}. Payload: ${JSON.stringify(payload)}`
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
    console.log(`✅ Webhook Blackcat processado com sucesso. Registros afetados: ${updatedRows.length}`);

    // Disparar CAPI se o status for PAGO / APROVADO
    if (newStatus === 'pago' && Array.isArray(updatedRows) && updatedRows.length > 0) {
      const dbRecord = updatedRows[0];
      await sendFacebookCapiEvent(dbRecord, 'Purchase').catch(e => console.error('Erro ao enviar CAPI via Webhook:', e.message));
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Webhook Blackcat processado com sucesso' })
    };

  } catch (err) {
    console.error('❌ Erro no processamento do Webhook Blackcat:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
