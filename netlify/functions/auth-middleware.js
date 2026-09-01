const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nzxwrhmvnipbhyykmtax.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_0ZhwMi7CJSgZdS2MOchsLg_opwVEz3g';
const SECRET = process.env.JWT_SECRET || 'super-secret-checkout-admin-key-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cachedActiveSessionId = null;
let lastCacheTime = 0;

async function getActiveSessionId() {
  const now = Date.now();
  if (cachedActiveSessionId && (now - lastCacheTime < 5000)) {
    return cachedActiveSessionId;
  }

  try {
    const { data } = await supabase
      .from('checkout_configs')
      .select('value')
      .eq('key', 'active_admin_session')
      .single();

    if (data && data.value) {
      const parsed = JSON.parse(data.value);
      cachedActiveSessionId = parsed.sessionId || null;
      lastCacheTime = now;
      return cachedActiveSessionId;
    }
  } catch (e) {
    console.error('Erro ao verificar sessão ativa no middleware:', e.message);
  }

  return cachedActiveSessionId;
}

exports.verifyToken = (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.split(' ')[1];
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const payload = parts[0];
  const signature = parts[1];
  
  const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64');
  if (signature !== expectedSignature) return false;
  
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (decoded.exp < Date.now()) return false;

    // Se o token possui um sessionId incorporado, valida se ele ainda é o ativo
    if (decoded.sessionId) {
      if (cachedActiveSessionId && decoded.sessionId !== cachedActiveSessionId) {
        return false;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
};

exports.verifySessionActiveAsync = async (event) => {
  if (!exports.verifyToken(event)) return false;

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader.split(' ')[1];
  const payload = token.split('.')[0];
  
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (decoded.sessionId) {
      const activeId = await getActiveSessionId();
      if (activeId && decoded.sessionId !== activeId) {
        return false;
      }
    }
    return true;
  } catch(e) {
    return false;
  }
};
