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

// Only replace fetch( if it's calling our local /api/
adminJs = adminJs.replace(/fetch\('\/api\//g, "fetchWithAuth('/api/");
adminJs = adminJs.replace(/fetch\(\\/api\//g, "fetchWithAuth(/api/");

// Insert the fetchWithAuthLogic near the top, after checkAuthentication
adminJs = adminJs.replace(/function checkAuthentication\(\)\s*\{/, fetchWithAuthLogic + "\n  function checkAuthentication() {");

// Update handleAuthentication to call /api/auth
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
          
          // Carregar os dados agora que estamos autenticados!
          if (typeof loadInitialData === 'function') {
            loadInitialData();
          }
          return;
        }
      }
      
      throw new Error('Credenciais invalidas');
    } catch (e) {
      // Efeito visual de falha
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

adminJs = adminJs.replace(/function handleAuthentication\(\)\s*\{[\s\S]*?\}\s*\}\s*\}\s*\}/, newAuthLogic);

fs.writeFileSync('js/admin.js', adminJs, 'utf8');
console.log('js/admin.js updated with auth');
