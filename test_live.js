async function runTest() {
    const payload = {
        payment_method: "pix",
        customer_name: "Teste Final Integracao",
        customer_cpf: "10156434423", // Valid CPF
        customer_email: "teste@checkout.com",
        customer_phone: "11988887777",
        items: [
            {
                name: "Produto Teste Web",
                price: 5.00,
                quantity: 1,
                sku: "TST-001"
            }
        ]
    };

    console.log("Enviando requisição de teste para o Checkout...");
    try {
        const res = await fetch("https://checkoutseguro-imporiomaissabor.netlify.app/.netlify/functions/checkout", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        console.log("Status HTTP:", res.status);
        console.log("Resposta Completa:", JSON.stringify(data, null, 2));
        
        if (data.pix_qr_code) {
            console.log("\n? SUCESSO! Código PIX Gerado:", data.pix_qr_code);
        } else {
            console.log("\n? FALHA: O Código PIX está vazio ou ausente.");
        }
    } catch (e) {
        console.error("Erro na requisição:", e);
    }
}
runTest();
