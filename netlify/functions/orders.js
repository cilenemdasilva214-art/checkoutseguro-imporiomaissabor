const { verifyToken } = require('./auth-middleware');
// Netlify Serverless Function: orders
// Caminho: netlify/functions/orders.js

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'OPTIONS' && event.httpMethod !== 'GET') {
    if (!verifyToken(event)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
  }

  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, OPTIONS',
      },
      body: JSON.stringify({ message: 'Successful preflight' }),
    };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'DELETE' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Método não permitido. Use GET, DELETE ou PATCH.' }),
    };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Configuração do banco de dados ausente no backend.' }),
    };
  }

  if (event.httpMethod === 'DELETE') {
    const idToDelete = event.queryStringParameters ? event.queryStringParameters.id : null;
    if (!idToDelete) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'ID é obrigatório para exclusão' }),
      };
    }
    
    let filterQuery = `id=eq.${idToDelete}`;
    if (idToDelete.includes(',')) {
      const idsArray = idToDelete.split(',').map(s => s.trim()).filter(Boolean);
      filterQuery = `id=in.(${idsArray.join(',')})`;
    }
    
    const targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/card_checkout_test_raw?${filterQuery}`;
    
    try {
      const response = await fetch(targetUrl, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro ao deletar pedido no Supabase: ${response.status} - ${errText}`);
      }

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: true, message: 'Deletado com sucesso' }),
      };
    } catch (error) {
      console.error('❌ Erro no DELETE de orders:', error);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: error.message }),
      };
    }
  }

  if (event.httpMethod === 'PATCH') {
    const idToUpdate = event.queryStringParameters ? event.queryStringParameters.id : null;
    if (!idToUpdate) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'ID é obrigatório para atualização' }),
      };
    }

    const targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/card_checkout_test_raw?id=eq.${idToUpdate}`;
    const payloadStr = event.body || '{}';
    let parsedBody = {};
    try { parsedBody = JSON.parse(payloadStr); } catch (e) {}

    try {
      const response = await fetch(targetUrl, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: payloadStr
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro ao atualizar pedido no Supabase: ${response.status} - ${errText}`);
      }

      const updatedRows = await response.json();
      const updatedRecord = (Array.isArray(updatedRows) && updatedRows.length > 0) ? updatedRows[0] : null;

      // Verificar se o status mudou para APROVADO / PAGO
      const newStatus = (parsedBody.status || (updatedRecord && updatedRecord.status) || '').toString().toLowerCase();
      const isApproved = ['pago', 'aprovado', 'approved', 'paid', 'success', 'confirmed'].includes(newStatus);

      let track7Result = null;
      if (isApproved && updatedRecord) {
        console.log(`🚚 Admin status mudou para '${newStatus}' no pedido ${idToUpdate}. Disparando para Track7...`);
        track7Result = await sendTrack7OrderEvent(updatedRecord);
      }

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: true, 
          message: 'Atualizado com sucesso',
          track7: track7Result,
          data: updatedRecord
        }),
      };
    } catch (error) {
      console.error('❌ Erro no PATCH de orders:', error);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: error.message }),
      };
    }
  }

  // Obter parâmetros da query string (limites, etc.)
  const id = event.queryStringParameters ? event.queryStringParameters.id : null;
  const limit = (event.queryStringParameters && event.queryStringParameters.limit) || '10000';

  // Detectar o domínio de onde partiu a requisição (através do referer)
  const referer = event.headers.referer || event.headers.referrer || '';
  let requestDomain = '';
  if (referer) {
    try {
      const refUrl = new URL(referer);
      requestDomain = refUrl.hostname;
    } catch (e) {
      console.warn('⚠️ Falha ao fazer parse do referer:', e.message);
    }
  }

  // Se houver um domínio configurado no Netlify (CHECKOUT_DOMAIN), use ele, senão use o hostname detectado
  const siteDomain = process.env.CHECKOUT_DOMAIN || requestDomain || '';

  // Se a requisição vier do painel admin, não força filtro de domínio via backend
  const isAdmin = referer.toLowerCase().includes('admin');

  let domainFilter = '';
  if (!isAdmin && siteDomain && siteDomain !== 'localhost' && siteDomain !== '127.0.0.1') {
    if (
      siteDomain.includes('imporiomaissabor') || 
      siteDomain.includes('porto') || 
      siteDomain.includes('vinho') || 
      siteDomain.includes('mysterious-goodall')
    ) {
      domainFilter = `or=(domain.eq.${siteDomain},domain.eq.checkoutseguro-imporiomaissabor.netlify.app,domain.eq.comprasegura-imporiomaissabor.netlify.app,domain.is.null)`;
    } else {
      domainFilter = `or=(domain.eq.${siteDomain},domain.is.null)`;
    }
  }
  
  let targetUrl;
  if (id) {
    targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/card_checkout_test_raw?id=eq.${id}&select=*`;
  } else {
    const filterSeparator = domainFilter ? `&${domainFilter}` : '';
    targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/card_checkout_test_raw?select=*${filterSeparator}&order=created_at.desc&limit=${limit}`;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ao buscar pedidos no Supabase: ${response.status} - ${errText}`);
    }

    const orders = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orders),
    };
  } catch (error) {
    console.error('❌ Erro no GET de orders:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

async function sendTrack7OrderEvent(dbRecord) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    const configUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/checkout_configs?select=*`;
    const configRes = await fetch(configUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!configRes.ok) return null;
    const configs = await configRes.json();
    let track7ApiKey = process.env.TRACK7_API_KEY || '';
    configs.forEach(c => {
      if (c.key === 'track7_api_key' && c.value) track7ApiKey = c.value;
    });

    if (!track7ApiKey || !track7ApiKey.trim()) {
      console.log('ℹ️ Track7: Chave API (X-API-Key) não configurada. Envio ignorado.');
      return null;
    }

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

    console.log(`🚚 Admin Status Update: Enviando pedido (${track7TransactionId}) para a Track7...`);
    const res = await fetch('https://track7.app/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': track7ApiKey.trim()
      },
      body: JSON.stringify(track7Payload)
    });

    const resData = await res.json().catch(() => ({}));
    if (res.ok || res.status === 201 || res.status === 200) {
      console.log(`✅ Track7 Admin Update: Pedido enviado com sucesso! Tracking code: ${resData.tracking_code || 'ok'}`);
      return { success: true, tracking_code: resData.tracking_code || null, response: resData };
    } else {
      console.warn(`⚠️ Track7 Admin Update Erro API (${res.status}):`, resData);
      return { success: false, status: res.status, error: resData };
    }
  } catch (err) {
    console.error('❌ Erro no envio do evento Track7 via Admin PATCH:', err.message);
    return { success: false, error: err.message };
  }
}
