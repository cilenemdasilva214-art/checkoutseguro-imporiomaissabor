const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nzxwrhmvnipbhyykmtax.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_0ZhwMi7CJSgZdS2MOchsLg_opwVEz3g';
const SECRET = process.env.JWT_SECRET || 'super-secret-checkout-admin-key-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const locationCache = {};

async function getIpLocation(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { city: 'Localhost', region: 'Desenvolvimento', country: 'Brasil', org: 'Rede Local' };
  }

  if (locationCache[ip]) {
    return locationCache[ip];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,query,org`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        const loc = {
          city: data.city || 'Desconhecido',
          region: data.regionName || 'Desconhecido',
          country: data.country || 'Brasil',
          org: data.org || ''
        };
        locationCache[ip] = loc;
        return loc;
      }
    }
  } catch (e) {
    console.error('Erro ao consultar IP Geolocation:', e.message);
  }

  return { city: 'Desconhecido', region: 'Desconhecido', country: 'Brasil', org: '' };
}

function extractClientIp(event) {
  const headers = event.headers || {};
  const ipHeader = headers['x-nf-client-connection-ip'] || 
                   headers['x-forwarded-for'] || 
                   headers['client-ip'] || 
                   headers['x-real-ip'] || 
                   '127.0.0.1';
  return ipHeader.split(',')[0].trim();
}

async function sendWhatsAppLoginAlert(wappiKey, phone, loginInfo) {
  if (!wappiKey || !phone) return;
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) return;

  const dateStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const msg = `🚨 *ALERTA DE SEGURANÇA - NOVO ACESSO AO PAINEL* 🚨\n\n` +
              `Um novo login foi efetuado no seu Painel Admin!\n\n` +
              `📅 *Data/Hora*: ${dateStr}\n` +
              `🌐 *IP*: ${loginInfo.ip}\n` +
              `📍 *Localização*: ${loginInfo.city} - ${loginInfo.region} (${loginInfo.country})\n` +
              `📱 *Dispositivo*: ${loginInfo.userAgent.slice(0, 60)}\n\n` +
              `⚠️ *Sessão Única Ativa*: Qualquer acesso anterior foi desconectado automaticamente por segurança.`;

  try {
    await fetch('https://api.wappi.pro/v1/message/send-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wappiKey}`
      },
      body: JSON.stringify({
        recipient: cleanPhone,
        message: msg
      })
    });
    console.log('✅ Alerta WhatsApp de login enviado para:', cleanPhone);
  } catch (e) {
    console.error('Erro ao enviar alerta WhatsApp:', e.message);
  }
}

exports.handler = async (event, context) => {
  try {
    const clientIp = extractClientIp(event);
    const userAgent = event.headers['user-agent'] || 'Desconhecido';
    const queryParams = event.queryStringParameters || {};
    const action = queryParams.action;

    // -----------------------------------------------------------
    // GET: Checagem de Sessão ou Histórico de Acessos
    // -----------------------------------------------------------
    if (event.httpMethod === 'GET') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      const token = authHeader.split(' ')[1];
      let decodedPayload = null;
      try {
        const parts = token.split('.');
        decodedPayload = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
      } catch(e) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Token inválido' }) };
      }

      if (action === 'check_session') {
        const { data: sessData } = await supabase
          .from('checkout_configs')
          .select('value')
          .eq('key', 'active_admin_session')
          .single();

        if (!sessData || !sessData.value) {
          return { statusCode: 200, body: JSON.stringify({ active: true }) };
        }

        let activeSess = {};
        try { activeSess = JSON.parse(sessData.value); } catch(e) {}

        if (decodedPayload.sessionId && activeSess.sessionId && decodedPayload.sessionId !== activeSess.sessionId) {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
              active: false,
              reason: 'logged_in_elsewhere',
              newIp: activeSess.ip,
              newLocation: `${activeSess.city || ''} - ${activeSess.region || ''}`,
              newTime: activeSess.loginTime
            })
          };
        }

        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ active: true }) };
      }

      if (action === 'logs') {
        const { data } = await supabase
          .from('checkout_configs')
          .select('key, value')
          .in('key', ['active_admin_session', 'admin_login_logs', 'admin_notify_phone', 'wappi_api_key']);

        let activeSession = null;
        let logs = [];
        let notifyPhone = '';
        let wappiKey = '';

        if (data && data.length > 0) {
          data.forEach(d => {
            if (d.key === 'active_admin_session' && d.value) {
              try { activeSession = JSON.parse(d.value); } catch(e) {}
            }
            if (d.key === 'admin_login_logs' && d.value) {
              try { logs = JSON.parse(d.value); } catch(e) {}
            }
            if (d.key === 'admin_notify_phone') notifyPhone = d.value;
            if (d.key === 'wappi_api_key') wappiKey = d.value;
          });
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ activeSession, logs, notifyPhone, wappiKeyConfigured: !!wappiKey })
        };
      }
    }

    // -----------------------------------------------------------
    // POST: Login ou Salvar Número de Notificação
    // -----------------------------------------------------------
    if (event.httpMethod === 'POST') {
      let body = {};
      try { body = JSON.parse(event.body); } catch(e) {}

      if (action === 'save_notify_phone') {
        const { notifyPhone } = body;
        await supabase
          .from('checkout_configs')
          .upsert({ key: 'admin_notify_phone', value: (notifyPhone || '').trim() });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: true, message: 'Número de notificação salvo' })
        };
      }

      // Login Principal
      const { username, password } = body;

      const { data, error } = await supabase
        .from('checkout_configs')
        .select('key, value')
        .in('key', ['admin_username', 'admin_password', 'admin_login_logs', 'wappi_api_key', 'admin_notify_phone']);

      if (error) throw error;

      let dbUser = 'admin';
      let dbPass = '123456789';
      let existingLogs = [];
      let wappiKey = '';
      let notifyPhone = '';

      if (data && data.length > 0) {
        const u = data.find(d => d.key === 'admin_username');
        const p = data.find(d => d.key === 'admin_password');
        const l = data.find(d => d.key === 'admin_login_logs');
        const w = data.find(d => d.key === 'wappi_api_key');
        const n = data.find(d => d.key === 'admin_notify_phone');

        if (u) dbUser = u.value;
        if (p) dbPass = p.value;
        if (w) wappiKey = w.value;
        if (n) notifyPhone = n.value;
        if (l && l.value) {
          try { existingLogs = JSON.parse(l.value); } catch(e) {}
        }
      }

      // Consultar geolocalização do IP
      const loc = await getIpLocation(clientIp);

      if (username === dbUser && password === dbPass) {
        const newSessionId = crypto.randomUUID();
        const loginTime = new Date().toISOString();

        const activeSession = {
          sessionId: newSessionId,
          ip: clientIp,
          city: loc.city,
          region: loc.region,
          country: loc.country,
          org: loc.org,
          loginTime,
          userAgent
        };

        const newLog = {
          id: crypto.randomUUID(),
          timestamp: loginTime,
          ip: clientIp,
          city: loc.city,
          region: loc.region,
          country: loc.country,
          status: 'SUCCESS',
          userAgent: userAgent.slice(0, 80),
          sessionId: newSessionId
        };

        const updatedLogs = [newLog, ...existingLogs].slice(0, 100);

        await Promise.all([
          supabase.from('checkout_configs').upsert({ key: 'active_admin_session', value: JSON.stringify(activeSession) }),
          supabase.from('checkout_configs').upsert({ key: 'admin_login_logs', value: JSON.stringify(updatedLogs) })
        ]);

        if (wappiKey && notifyPhone) {
          sendWhatsAppLoginAlert(wappiKey, notifyPhone, activeSession);
        }

        const payload = Buffer.from(JSON.stringify({ 
          user: username, 
          sessionId: newSessionId, 
          exp: Date.now() + 86400000 
        })).toString('base64');
        const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64');
        const token = payload + '.' + signature;
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: true, 
            token, 
            sessionId: newSessionId, 
            ip: clientIp, 
            location: `${loc.city} - ${loc.region}` 
          })
        };

      } else {
        const failedLog = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          ip: clientIp,
          city: loc.city,
          region: loc.region,
          country: loc.country,
          status: 'FAILED',
          userAgent: userAgent.slice(0, 80)
        };
        const updatedLogs = [failedLog, ...existingLogs].slice(0, 100);
        await supabase.from('checkout_configs').upsert({ key: 'admin_login_logs', value: JSON.stringify(updatedLogs) });

        await new Promise(resolve => setTimeout(resolve, 2500));
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: false, message: 'Credenciais inválidas' })
        };
      }
    }

    return { statusCode: 405, body: 'Method Not Allowed' };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
