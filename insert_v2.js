const fs = require('fs');
let code = fs.readFileSync('admin.html', 'utf8');

const anchor = '            <!-- PagFlexBR Card -->';
const newCard =             <!-- Payshark V2 Card -->
            <div class="gateway-card" id="card-paysharkv2">
              <div class="gateway-header">
                <div class="gateway-info">
                  <div class="gateway-logo">
                    <i class="fa-solid fa-water" style="color: #1d4ed8;"></i>
                  </div>
                  <div>
                    <h3>Payshark V2 VERSÃO NOVA</h3>
                    <span class="badge secondary-badge">Exclusivo Pix</span>
                  </div>
                </div>
                <div class="gateway-toggle">
                  <label class="switch">
                    <input type="checkbox" id="toggle-paysharkv2">
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
              <div class="gateway-body">
                <div class="settings-group">
                  <label for="paysharkv2-api-key">Chave de API (Pagamentos)</label>
                  <div class="settings-input-wrapper">
                    <i class="fa-solid fa-key"></i>
                    <input type="password" id="paysharkv2-api-key" placeholder="Insira a Chave Bearer">
                    <button type="button" class="btn-toggle-visibility" data-target="paysharkv2-api-key">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                  </div>
                </div>
                <div class="settings-group">
                  <label for="paysharkv2-transfer-key">Chave de API (Saques - Opcional)</label>
                  <div class="settings-input-wrapper">
                    <i class="fa-solid fa-lock"></i>
                    <input type="password" id="paysharkv2-transfer-key" placeholder="Insira a Chave Bearer de Saque">
                    <button type="button" class="btn-toggle-visibility" data-target="paysharkv2-transfer-key">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- PagFlexBR Card -->;

if (code.includes(anchor)) {
  code = code.replace(anchor, newCard);
  fs.writeFileSync('admin.html', code);
  console.log('Added Payshark V2 to admin.html');
} else {
  console.log('Could not find anchor in admin.html');
}
