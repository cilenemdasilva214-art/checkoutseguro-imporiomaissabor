// Netlify Serverless Function: Webhook Payshark V2
// Caminho: netlify/functions/webhook-paysharkv2.js

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

    // Identificar ID da transação
    // A Payshark pode mandar id, transactionId, externalRef, paymentId
    const transactionId = payload.id || payload.transactionId || payload.externalRef || payload.paymentId;
    
    if (!transactionId) {
      console.warn("Webhook sem ID de transação detectado.");
      return { statusCode: 400, body: JSON.stringify({ error: 'ID da transação não encontrado no payload' }) };
    }

    // Identificar Status
    // A Payshark pode mandar status: 'PAID', 'APPROVED', 'REFUSED', 'CANCELED', etc.
    const statusStr = (payload.status || payload.state || '').toString().toUpperCase();
    
    let newStatus = 'pendente';
    if (statusStr === 'PAID' || statusStr === 'APPROVED' || statusStr === 'CONFIRMED' || statusStr === 'PAGO' || statusStr === 'APROVADO') {
      newStatus = 'pago';
    } else if (statusStr === 'REFUSED' || statusStr === 'CANCELED' || statusStr === 'CANCELLED' || statusStr === 'DECLINED' || statusStr === 'RECUSADO' || statusStr === 'CANCELADO') {
      newStatus = 'recusado';
    } else if (statusStr === 'REFUNDED' || statusStr === 'CHARGEBACK' || statusStr === 'ESTORNADO') {
      newStatus = 'estornado';
    } else {
      // Status desconhecido, logaremos no banco apenas o payload bruto na nota
      console.log(`Status desconhecido recebido: ${statusStr}`);
    }

    // Atualizar no Supabase (tabela card_checkout_test_raw)
    // Tenta atualizar buscando por gateway_tx_id. Se falhar ou se quiser usar externalRef, ele faz o MATCH.
    const targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/card_checkout_test_raw?gateway_tx_id=eq.${encodeURIComponent(transactionId)}`;
    
    const updatePayload = {
      status: newStatus,
      // Salva um log do webhook na coluna admin_notes caso queiramos debugar pelo painel
      admin_notes: `[Webhook Payshark V2] Atualizado em ${new Date().toLocaleString('pt-BR')}. Payload: ${JSON.stringify(payload)}`
    };

    const response = await fetch(targetUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(updatePayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase erro: ${response.status} - ${errText}`);
    }

    console.log(`Webhook processado com sucesso. Pedido ${transactionId} -> ${newStatus}`);
    
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
