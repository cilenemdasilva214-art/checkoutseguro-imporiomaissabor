const fs = require('fs');

let adminJs = fs.readFileSync('js/admin.js', 'utf8');

const fetchWithAuthLogic = 
async function fetchWithAuth(url, options = {}) {
  const token = safeStorage.getItem('admin_token');
  if (token) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  return fetch(url, options);
}
;

// Replace fetch calls
adminJs = adminJs.split("await fetch('/api/").join("await fetchWithAuth('/api/");
adminJs = adminJs.split("await fetch(/api/").join("await fetchWithAuth(/api/");
adminJs = adminJs.split("fetch('/api/config')").join("fetchWithAuth('/api/config')");
adminJs = adminJs.split("fetch('/api/orders").join("fetchWithAuth('/api/orders");

// Insert fetchWithAuthLogic
adminJs = adminJs.replace("function checkAuthentication() {", fetchWithAuthLogic + "\n  function checkAuthentication() {");

const newAuthLogic = 
  async function handleAuthentication() {
    const typedUser = loginUsernameInput ? loginUsernameInput.value.trim() : '';
    const typedPass = loginPasswordInput ? loginPasswordInput.value : '';

    try {
      const btnIcon = btnLoginSubmit.innerHTML;
      btnLoginSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Autenticando...';
      btnLoginSubmit.disabled = true;

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: typedUser, password: typedPass })
      });

      btnLoginSubmit.innerHTML = btnIcon;
      btnLoginSubmit.disabled = false;

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          safeStorage.setItem('admin_token', data.token);
          safeStorage.setItem('admin_authenticated', 'true');
          safeStorage.setItem('admin_login_time', Date.now().toString());
          if (lockScreen) lockScreen.classList.add('hide');
          if (loginUsernameInput) loginUsernameInput.value = '';
          if (loginPasswordInput) loginPasswordInput.value = '';
          
          if (typeof loadInitialData === 'function') {
            loadInitialData();
          }
          return;
        }
      }
      throw new Error('Credenciais invalidas');
    } catch (e) {
      const shakeTargets = [loginUsernameInput, loginPasswordInput];
      shakeTargets.forEach(el => {
        if (el) {
          el.style.border = '2px solid var(--danger-color)';
          el.style.boxShadow = '0 0 15px var(--danger-glow)';
          el.classList.add('shake-animation');
        }
      });
      setTimeout(() => {
        shakeTargets.forEach(el => {
          if (el) {
            el.style.border = '';
            el.style.boxShadow = '';
            el.classList.remove('shake-animation');
          }
        });
      }, 500);
      alert('Usuário ou senha incorretos! Tente novamente.');
      if (loginPasswordInput) {
        loginPasswordInput.value = '';
        loginPasswordInput.focus();
      }
    }
  }
;

// Replace handleAuthentication block by finding its start and end
const startIdx = adminJs.indexOf("function handleAuthentication() {");
const endIdx = adminJs.indexOf("  // Bind dos eventos de segurança");
if (startIdx !== -1 && endIdx !== -1) {
    adminJs = adminJs.substring(0, startIdx) + newAuthLogic + "\n" + adminJs.substring(endIdx);
}

// Add protection to loadInitialData
const loadInitialDataStart = adminJs.indexOf("async function loadInitialData() {");
if (loadInitialDataStart !== -1) {
    const insertAfter = "async function loadInitialData() {\n";
    const condition = "    if (safeStorage.getItem('admin_authenticated') !== 'true') return;\n";
    const insertionPoint = loadInitialDataStart + insertAfter.length;
    adminJs = adminJs.substring(0, insertionPoint) + condition + adminJs.substring(insertionPoint);
}

// Remove hardcoded adminUsername and adminPassword let declarations
adminJs = adminJs.replace(/let adminUsername = 'admin';/g, "");
adminJs = adminJs.replace(/let adminPassword = '123456789';/g, "");

// In validate and save configs, we still want to read newUsername/newPassword from DOM but we won't update global variables anymore since they are removed
adminJs = adminJs.replace("adminUsername = newUsername;", "");
adminJs = adminJs.replace("adminPassword = newPassword;", "");
adminJs = adminJs.replace(/adminUsername = configData.admin_username \|\| 'admin';/g, "");
adminJs = adminJs.replace(/adminPassword = configData.admin_password \|\| '123456789';/g, "");
adminJs = adminJs.replace(/if \(configAdminUsername\) configAdminUsername\.value = adminUsername;/g, "");
adminJs = adminJs.replace(/if \(configAdminPassword\) configAdminPassword\.value = adminPassword;/g, "");

// Setup the 30s polling
adminJs = adminJs + "\n\n// Polling de 30 segundos para manter dados atualizados sem WebSocket\nsetInterval(() => {\n  if (safeStorage.getItem('admin_authenticated') === 'true') {\n    loadInitialData();\n  }\n}, 30000);\n";

fs.writeFileSync('js/admin.js', adminJs, 'utf8');
console.log('js/admin.js updated fully!');
