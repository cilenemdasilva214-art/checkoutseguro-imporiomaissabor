require('dotenv').config({ path: 'netlify/.env' });
const fetch = require('node-fetch');

async function fixOrder() {
  const SUPABASE_URL = 'https://lqwexpieqikhudcsnzdg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxd2V4cGllcWlraHVkY3NuemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDc0MzAsImV4cCI6MjA5NDcyMzQzMH0.FtUzSzya2vpgNRR3iHqAQBozDiunwbHF_6q0aGKXZH8';

  const orderId = 'd52948c0-654e-468c-87c1-e183a8aa8ab8';
  
  const targetUrl = $SUPABASE_URL/rest/v1/card_checkout_test_raw?id=eq.;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': Bearer ,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: 'PAID' })
    });
    
    if (response.ok) {
      console.log('Order fixed successfully');
    } else {
      console.log('Error:', await response.text());
    }
  } catch(e) {
    console.error(e);
  }
}
fixOrder();
