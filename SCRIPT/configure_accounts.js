const selectEl = document.getElementById('accountName');
const form = document.getElementById('configForm');

function collectFormData() {
  const config = {};
  document.querySelectorAll('#configForm [id]').forEach(el => {
    if (el.type === 'checkbox') {
      config[el.id] = el.checked;
    } else {
      config[el.id] = el.value.trim();
    }
  });
  return config;
}

function showNotification(message, color = '#28a745') {
  const notif = document.getElementById('saveNotification');
  notif.innerText = message;
  notif.style.backgroundColor = color;
  notif.style.opacity = 1;

  setTimeout(() => {
    notif.style.opacity = 0;
  }, 2000);
}

function syncLocalStorageWithServer() {
  fetch('JSON/acounts.json')
    .then(response => response.json())
    .then(serverAccounts => {
      if (Array.isArray(serverAccounts)) {
        localStorage.setItem('configureAccounts', JSON.stringify(serverAccounts));
      }
    })
    .catch(error => {
      console.error('Erreur lors de la synchronisation avec le serveur:', error);
    });
}

function saveManually(event) {
  event.preventDefault();

  const config = collectFormData();

  let accounts = JSON.parse(localStorage.getItem('configureAccounts')) || [];
  accounts = accounts.filter(a => a.accountName !== config.accountName);
  accounts.push(config);

  localStorage.setItem('configureAccounts', JSON.stringify(accounts));
  localStorage.setItem('currentAccount', config.accountName);

  fetch('api/save_accounts.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('✅ Modifications sauvegardées', '#28a745');
      syncLocalStorageWithServer(); // 🔥 Synchronise avec le serveur
      updateAccountsTable();         // 🔥 Recharge ton tableau après synchronisation
    } else {
      showNotification('❌ Erreur de sauvegarde', '#dc3545');
    }
  })
  .catch(error => {
    console.error('Erreur réseau:', error);
    showNotification('❌ Erreur réseau', '#dc3545');
  });
}


function loadAccountOptions() {
  selectEl.innerHTML = ''; // On vide tout

  const availableAccounts = (JSON.parse(localStorage.getItem('availableAccounts')) || [])
    .filter(a => a.account && a.account.trim() !== "");

  const configuredAccounts = (JSON.parse(localStorage.getItem('configureAccounts')) || [])
    .filter(a => a.accountName && a.accountName.trim() !== "");

  const mergedAccounts = [...availableAccounts];

  configuredAccounts.forEach(config => {
    if (!mergedAccounts.find(acc => acc.account === config.accountName)) {
      mergedAccounts.push({ account: config.accountName });
    }
  });

  if (mergedAccounts.length === 0) {
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Sélectionnez un compte';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectEl.appendChild(defaultOption);
  } else {
    mergedAccounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.account;
      opt.text = a.account;
      selectEl.appendChild(opt);
    });
  }
}

function loadAccountSettings(accountName) {
  const allAccounts = JSON.parse(localStorage.getItem('configureAccounts')) || [];
  const selected = allAccounts.find(a => a.accountName === accountName);
  if (selected) {
    Object.keys(selected).forEach(key => {
      const field = document.getElementById(key);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = selected[key];
        } else {
          field.value = selected[key];
        }
      }
    });
  } else {
    form.reset();
  }
}

selectEl.addEventListener('change', function() {
  const selectedAccount = this.value;
  if (selectedAccount && selectedAccount !== "undefined") {
    localStorage.setItem('currentAccount', selectedAccount);
    loadAccountSettings(selectedAccount);
  } else {
    form.reset();
  }
});

// 🔥 Lier la sauvegarde au clic sur le bouton "Sauvegarder"
const saveButton = form.querySelector('button[type="submit"]');
saveButton.addEventListener('click', saveManually);

// 🚀 Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
  syncLocalStorageWithServer();
  setTimeout(() => {
    loadAccountOptions();

    const params = new URLSearchParams(window.location.search);
    const urlAccount = params.get('account');
    const currentAccount = localStorage.getItem('currentAccount');

    if (urlAccount && urlAccount.trim() !== "undefined" && urlAccount.trim() !== "") {
      selectEl.value = urlAccount;
      loadAccountSettings(urlAccount);
    } else if (currentAccount && currentAccount.trim() !== "undefined" && currentAccount.trim() !== "") {
      selectEl.value = currentAccount;
      loadAccountSettings(currentAccount);
    } else {
      // Sinon aucune sélection
      form.reset();
    }
  }, 300);
});
