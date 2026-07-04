const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nzxwrhmvnipbhyykmtax.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_0ZhwMi7CJSgZdS2MOchsLg_opwVEz3g';
const SECRET = process.env.JWT_SECRET || 'super-secret-checkout-admin-key-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    const { data, error } = await supabase
      .from('checkout_configs')
      .select('key, value')
      .in('key', ['admin_username', 'admin_password']);

    if (error) throw error;

    let dbUser = 'admin';
    let dbPass = '123456789';

    if (data && data.length > 0) {
      const u = data.find(d => d.key === 'admin_username');
      const p = data.find(d => d.key === 'admin_password');
      if (u) dbUser = u.value;
      if (p) dbPass = p.value;
    }

    if (username === dbUser && password === dbPass) {
      const payload = Buffer.from(JSON.stringify({ user: username, exp: Date.now() + 86400000 })).toString('base64');
      const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64');
      const token = payload + '.' + signature;
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, token })
      };
    } else {
      // Anti Brute-Force Delay (2.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 2500));
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: 'Invalid credentials' })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
