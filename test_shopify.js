const store = 'd16ech-rb.myshopify.com';
const token = 'YOUR_SHOPIFY_ACCESS_TOKEN';
(async () => {
  try {
    const orderPayload = {
      order: {
        line_items: [{ title: 'Produto Teste', price: '15.50', quantity: 1 }],
        customer: { first_name: 'Teste', last_name: 'Antigravity', email: 'teste@antigravity.com' },
        financial_status: 'pending',
        tags: 'CheckoutSeguro, pix'
      }
    };
    const res = await fetch('https://' + store + '/admin/api/2023-10/orders.json', {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text.substring(0, 300));
  } catch(e) { console.error(e); }
})();
