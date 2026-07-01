const fs = require('fs');

let content = fs.readFileSync('js/admin.js', 'utf8');

// Adicionar botão Editar logo após o botão Detalhes
const regex = /(<button class="btn-table-action btn-detail-trigger" data-id="\$\{([^}]+)\}">\s*<i class="fa-regular fa-eye"><\/i> Detalhes\s*<\/button>)/g;
content = content.replace(regex, `$1\n              <button class="btn-table-action btn-edit-trigger" data-id="\${$2}" style="background:rgba(59,130,246,0.1); color:#3b82f6; border:1px solid rgba(59,130,246,0.2);">\n                <i class="fa-regular fa-pen-to-square"></i> Editar\n              </button>`);

// Adicionar chamada addEditButtonListeners(); logo após addDetailButtonListeners();
content = content.replace(/addDetailButtonListeners\(\);/g, 'addDetailButtonListeners();\n      addEditButtonListeners();');

// Adicionar a lógica do modal de edição no final do arquivo
const editLogic = `

  // ==========================================
  // LÓGICA DO MODAL DE EDIÇÃO DE PEDIDO
  // ==========================================
  const editModal = document.getElementById('edit-order-modal');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const editForm = document.getElementById('edit-order-form');

  if (btnCloseEditModal) {
    btnCloseEditModal.addEventListener('click', () => {
      editModal.style.display = 'none';
    });
  }

  function addEditButtonListeners() {
    const editButtons = document.querySelectorAll('.btn-edit-trigger');
    editButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openEditModal(id);
      });
    });
  }

  async function openEditModal(id) {
    let tx = window.allTransactions && window.allTransactions.find(t => t.id === id);
    if (!tx) {
      try {
        const { data } = await supabaseClient.from('card_checkout_test_raw').select('*').eq('id', id).single();
        if (data) tx = data;
      } catch (e) {
        console.error(e);
      }
    }
    
    if (!tx) {
        alert('Transação não encontrada para edição.');
        return;
    }

    document.getElementById('edit-order-id').value = tx.id;
    document.getElementById('edit-customer-name').value = tx.customer_name || '';
    document.getElementById('edit-customer-email').value = tx.customer_email || '';
    document.getElementById('edit-customer-phone').value = tx.customer_phone || '';
    document.getElementById('edit-order-amount').value = tx.amount || '0.00';
    document.getElementById('edit-order-status').value = tx.status || 'draft';

    editModal.style.display = 'flex';
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-order-id').value;
      const payload = {
        customer_name: document.getElementById('edit-customer-name').value,
        customer_email: document.getElementById('edit-customer-email').value,
        customer_phone: document.getElementById('edit-customer-phone').value,
        amount: parseFloat(document.getElementById('edit-order-amount').value),
        status: document.getElementById('edit-order-status').value
      };

      try {
        const { error } = await supabaseClient
          .from('card_checkout_test_raw')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
        alert('Pedido atualizado com sucesso!');
        editModal.style.display = 'none';
        
        if (typeof fetchTransactions === 'function') {
            fetchTransactions();
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao atualizar pedido: ' + err.message);
      }
    });
  }
`;

content = content.replace(/\}\);\s*$/g, editLogic + '\n});');

fs.writeFileSync('js/admin.js', content, 'utf8');
console.log('Botões e lógica de edição adicionados no admin.js');
