require('dotenv').config({ path: 'netlify/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkOrders() {
  const supabase = createClient('https://lqwexpieqikhudcsnzdg.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxd2V4cGllcWlraHVkY3NuemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDc0MzAsImV4cCI6MjA5NDcyMzQzMH0.FtUzSzya2vpgNRR3iHqAQBozDiunwbHF_6q0aGKXZH8');
  const { data, error } = await supabase
    .from('card_checkout_test_raw')
    .select('id, created_at, status, payment_method, customer_name, amount')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
checkOrders();
