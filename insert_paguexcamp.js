const fs = require('fs');
let code = fs.readFileSync('admin.html', 'utf8');

const newCard = 
            <!-- Pague-X CAMP BLACK Card -->
            <div class="gateway-card" id="card-paguexcamp">
              <div class="gateway-header">
                <div class="gateway-info">
                  <div class="gateway-logo" style="background: #000;">
                    <i class="fa-solid fa-credit-card" style="color: #fff;"></i>
                  </div>
                  <div>
                    <h3>Pague-X CAMP BLACK</h3>
                    <span class="badge" style="background: #000; color: #fff;">Pix & Cartão</span>
                  </div>
                </div>
                <div class="gateway-toggle">
                  <label class="switch">
                    <input type="checkbox" id="toggle-paguexcamp">
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
              <div class="gateway-body">
                <div class="settings-group">
                  <label for="paguexcamp-public-key">Chave Pública (Public Key)</label>
                  <div class="settings-input-wrapper">
                    <i class="fa-solid fa-key"></i>
                    <input type="text" id="paguexcamp-public-key" placeholder="Insira a Public Key">
                  </div>
                </div>
                <div class="settings-group">
                  <label for="paguexcamp-secret-key">Chave Secreta (Secret Key)</label>
                  <div class="settings-input-wrapper">
                    <i class="fa-solid fa-lock"></i>
                    <input type="password" id="paguexcamp-secret-key" placeholder="Insira a Secret Key">
                    <button type="button" class="btn-toggle-visibility" data-target="paguexcamp-secret-key">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
;

code = code.replace(
  '            <!-- HyperCash Card -->',
  newCard + '\n            <!-- HyperCash Card -->'
);

fs.writeFileSync('admin.html', code);
