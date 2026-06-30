const url = 'https://nzxwrhmvnipbhyykmtax.supabase.co/rest/v1/card_checkout_test_raw?select=created_at,gateway_response&order=created_at.desc&limit=2';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxd2V4cGllcWlraHVkY3NuemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDc0MzAsImV4cCI6MjA5NDcyMzQzMH0.FtUzSzya2vpgNRR3iHqAQBozDiunwbHF_6q0aGKXZH8';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2))).catch(console.error);
