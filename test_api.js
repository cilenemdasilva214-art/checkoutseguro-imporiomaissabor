async function testApi() {
    const payload = {
        amount: 100,
        currency: "BRL",
        method: "PIX",
        description: "Pedido na loja",
        externalRef: "order_12345",
        notificationUrl: "https://checkoutseguro-imporiomaissabor.netlify.app/.netlify/functions/webhook-paysharkv2",
        payer: {
            name: "João Silva",
            taxId: "52998224725", // Gen CPF
            email: "joao@email.com",
            phone: "11999999999"
        },
        items: [
            {
                quantity: 1,
                name: "Produto",
                price: 100,
                type: "DIGITAL"
            }
        ]
    };

    try {
        const res = await fetch("https://api.gatewaypayshark.com.br/v1/payment", {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer p7qXCSJdHiftUHv4htgW4fn6BfBMEdpOS9ctOl0rTFk',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testApi();
