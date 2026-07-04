const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET || 'super-secret-checkout-admin-key-2026';

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
    return true;
  } catch (e) {
    return false;
  }
};
