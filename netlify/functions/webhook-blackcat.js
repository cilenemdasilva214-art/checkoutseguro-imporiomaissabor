// Netlify Serverless Function: Webhook Blackcat
// Caminho: netlify/functions/webhook-blackcat.js

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

    // A Blackcat pode enviar o payload na raiz ou encapsulado dentro de 'data' ou 'transaction'
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
