function generateCPF() {
    const randomDigit = () => Math.floor(Math.random() * 10);
    const p = Array.from({length: 9}, randomDigit);
    const d1 = 11 - (p.reduce((acc, v, i) => acc + v * (10 - i), 0) % 11);
    p.push(d1 > 9 ? 0 : d1);
    const d2 = 11 - (p.reduce((acc, v, i) => acc + v * (11 - i), 0) % 11);
    p.push(d2 > 9 ? 0 : d2);
    return p.join('');
}
const cpf = generateCPF();
console.log("Testing CPF:", cpf);

async function testApi() {
    const payload = {
        amount: 1000,
        currency: "BRL",
        method: "PIX",
        description: "Pedido na loja",
        externalRef: "order_12345",
        notificationUrl: "https://checkoutseguro-imporiomaissabor.netlify.app/.netlify/functions/webhook-paysharkv2",
        payer: {
            name: "João Silva",
            taxId: cpf,
            email: "joao@email.com",
            phone: "11999999999"
        },
        items: [
            {
                quantity: 1,
                name: "Produto",
                price: 1000,
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
