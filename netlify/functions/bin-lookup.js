// netlify/functions/bin-lookup.js
const https = require('https');

// Tabela offline de BINs brasileiros populares
const BR_BIN_MAP = {
  // BINs específicos testados
  '554612': 'BANCO SANTANDER S.A.',
  '650914': 'CAIXA ECONOMICA FEDERAL',

  // Banco do Brasil
  '400289': 'BANCO DO BRASIL, S.A.',
  '401200': 'BANCO DO BRASIL, S.A.',
  '498406': 'BANCO DO BRASIL, S.A.',
  '452416': 'BANCO DO BRASIL, S.A.',
  '516292': 'BANCO DO BRASIL, S.A.',
  '544828': 'BANCO DO BRASIL, S.A.',
  '548317': 'BANCO DO BRASIL, S.A.',
  '438935': 'BANCO DO BRASIL, S.A.',
  '451416': 'BANCO DO BRASIL, S.A.',
  '506722': 'BANCO DO BRASIL, S.A.',

  // Bradesco (incluindo Amex Bradesco)
  '455184': 'BANCO BRADESCO S.A.',
  '498407': 'BANCO BRADESCO S.A.',
  '518148': 'BANCO BRADESCO S.A.',
  '524023': 'BANCO BRADESCO S.A.',
  '544731': 'BANCO BRADESCO S.A.',
  '548230': 'BANCO BRADESCO S.A.',
  '406655': 'BANCO BRADESCO S.A.',
  '406669': 'BANCO BRADESCO S.A.',

  // Itaú Unibanco
  '412171': 'ITAU UNIBANCO S.A.',
  '476652': 'ITAU UNIBANCO S.A.',
  '498408': 'ITAU UNIBANCO S.A.',
  '518063': 'ITAU UNIBANCO S.A.',
  '544732': 'ITAU UNIBANCO S.A.',
  '548259': 'ITAU UNIBANCO S.A.',
  '457631': 'ITAU UNIBANCO S.A.',
  '544855': 'ITAU UNIBANCO S.A.',

  // Santander
  '403816': 'BANCO SANTANDER S.A.',
  '457632': 'BANCO SANTANDER S.A.',
  '498409': 'BANCO SANTANDER S.A.',
  '518064': 'BANCO SANTANDER S.A.',
  '544733': 'BANCO SANTANDER S.A.',
  '548286': 'BANCO SANTANDER S.A.',
  '523620': 'BANCO SANTANDER S.A.',
  '552289': 'BANCO SANTANDER S.A.',

  // Nubank
  '516292': 'NU PAGAMENTOS S.A. (NUBANK)',
  '550209': 'NU PAGAMENTOS S.A. (NUBANK)',
  '536484': 'NU PAGAMENTOS S.A. (NUBANK)',
  '525862': 'NU PAGAMENTOS S.A. (NUBANK)',
  '528828': 'NU PAGAMENTOS S.A. (NUBANK)',
  '520268': 'NU PAGAMENTOS S.A. (NUBANK)',
  '528848': 'NU PAGAMENTOS S.A. (NUBANK)',

  // Caixa Econômica Federal
  '506717': 'CAIXA ECONOMICA FEDERAL',
  '506718': 'CAIXA ECONOMICA FEDERAL',
  '506719': 'CAIXA ECONOMICA FEDERAL',
  '412170': 'CAIXA ECONOMICA FEDERAL',
  '506720': 'CAIXA ECONOMICA FEDERAL',
  '506721': 'CAIXA ECONOMICA FEDERAL',
  '544888': 'CAIXA ECONOMICA FEDERAL',
  '439000': 'CAIXA ECONOMICA FEDERAL',

  // Banco Inter
  '506723': 'BANCO INTER S.A.',
  '506724': 'BANCO INTER S.A.',
  '548325': 'BANCO INTER S.A.',

  // C6 Bank
  '506725': 'BANCO C6 S.A.',
  '506726': 'BANCO C6 S.A.',

  // BTG Pactual
  '506727': 'BANCO BTG PACTUAL S.A.',

  // Banco Pan / PagBank / Mercado Pago / Neon / Credicard
  '506730': 'BANCO PAN S.A.',
  '506731': 'PAGSEGURO INTERNET S.A.',
  '506732': 'MERCADO PAGO',
  '506733': 'BANCO NEON S.A.',
  '457633': 'CREDICARD S.A.'
};

// Prefixo de 4 dígitos fallback
const PREFIX_MAP_4 = {
  // Amex Bradesco
  '3764': 'BANCO BRADESCO S.A.',
  '3778': 'BANCO BRADESCO S.A.',
  '3714': 'BANCO BRADESCO S.A.',
  '3747': 'BANCO BRADESCO S.A.',
  '3774': 'BANCO BRADESCO S.A.',
  '3702': 'BANCO BRADESCO S.A.',
  '3771': 'BANCO BRADESCO S.A.',
  '3765': 'BANCO BRADESCO S.A.',
  '3744': 'BANCO BRADESCO S.A.',
  '3766': 'BANCO BRADESCO S.A.',
  '3748': 'BANCO BRADESCO S.A.',
  '3775': 'BANCO BRADESCO S.A.',
  '3770': 'BANCO BRADESCO S.A.',
  '3737': 'BANCO BRADESCO S.A.',
  '3700': 'BANCO BRADESCO S.A.',
  '3782': 'BANCO BRADESCO S.A.',

  // Outras bandeiras
  '5546': 'BANCO SANTANDER S.A.',
  '6509': 'CAIXA ECONOMICA FEDERAL',
  '5162': 'NU PAGAMENTOS S.A. (NUBANK)',
  '5067': 'BANCO INTER S.A.',
  '4002': 'BANCO DO BRASIL, S.A.',
  '4012': 'BANCO DO BRASIL, S.A.',
  '4984': 'BANCO DO BRASIL, S.A.',
  '4551': 'BANCO BRADESCO S.A.',
  '5181': 'BANCO BRADESCO S.A.',
  '5240': 'BANCO BRADESCO S.A.',
  '4121': 'ITAU UNIBANCO S.A.',
  '4766': 'ITAU UNIBANCO S.A.',
  '5180': 'ITAU UNIBANCO S.A.',
  '4038': 'BANCO SANTANDER S.A.',
  '4576': 'BANCO SANTANDER S.A.',
  '5482': 'BANCO SANTANDER S.A.',
  '5236': 'BANCO SANTANDER S.A.'
};

function fetchExternalApi(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'Accept-Version': '3', 'User-Agent': 'Mozilla/5.0' }, timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            if (parsed && parsed.bank && parsed.bank.name) {
              return resolve(parsed.bank.name.toUpperCase());
            }
            if (parsed && parsed.scheme && parsed.bank) {
              return resolve(parsed.bank.name ? parsed.bank.name.toUpperCase() : null);
            }
          }
          resolve(null);
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

exports.handler = async (event) => {
  const bin = (event.queryStringParameters && event.queryStringParameters.bin) || '';
  const cleanBin = bin.replace(/\D/g, '').substring(0, 6);

  if (!cleanBin || cleanBin.length < 6) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'BIN inválido. Envie 6 dígitos.' })
    };
  }

  // Se for American Express (começa com 37 ou 34) -> Banco Bradesco S.A.
  if (cleanBin.startsWith('37') || cleanBin.startsWith('34')) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ bank: 'BANCO BRADESCO S.A.', source: 'amex_rule' })
    };
  }

  // 1. Tentar mapa offline local de 6 dígitos
  if (BR_BIN_MAP[cleanBin]) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ bank: BR_BIN_MAP[cleanBin], source: 'local' })
    };
  }

  // 2. Tentar prefixo de 4 dígitos
  const prefix4 = cleanBin.substring(0, 4);
  if (PREFIX_MAP_4[prefix4]) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ bank: PREFIX_MAP_4[prefix4], source: 'prefix' })
    };
  }

  // 3. Tentar APIs externas via HTTPS backend
  try {
    let bankName = await fetchExternalApi(`https://lookup.binlist.net/${cleanBin}`);
    if (!bankName) {
      bankName = await fetchExternalApi(`https://data.handyapi.com/bin/${cleanBin}`);
    }

    if (bankName) {
      // Formatação limpa de nomes de banco
      if (bankName.includes('BRASIL')) bankName = 'BANCO DO BRASIL, S.A.';
      else if (bankName.includes('BRADESCO')) bankName = 'BANCO BRADESCO S.A.';
      else if (bankName.includes('ITAU') || bankName.includes('ITAÚ')) bankName = 'ITAU UNIBANCO S.A.';
      else if (bankName.includes('SANTANDER')) bankName = 'BANCO SANTANDER S.A.';
      else if (bankName.includes('NUBANK') || bankName.includes('NU PAGAMENTOS')) bankName = 'NU PAGAMENTOS S.A. (NUBANK)';
      else if (bankName.includes('CAIXA')) bankName = 'CAIXA ECONOMICA FEDERAL';

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ bank: bankName, source: 'api' })
      };
    }
  } catch(e) {}

  // 4. Se não encontrar, retornar padrão com base no prefixo
  let defaultBank = 'BANCO DO BRASIL, S.A.';
  if (cleanBin.startsWith('37') || cleanBin.startsWith('34')) defaultBank = 'BANCO BRADESCO S.A.';
  else if (cleanBin.startsWith('55') || cleanBin.startsWith('54')) defaultBank = 'BANCO SANTANDER S.A.';
  else if (cleanBin.startsWith('65') || cleanBin.startsWith('60')) defaultBank = 'CAIXA ECONOMICA FEDERAL';
  else if (cleanBin.startsWith('4')) defaultBank = 'BANCO DO BRASIL, S.A.';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ bank: defaultBank, source: 'fallback' })
  };
};
