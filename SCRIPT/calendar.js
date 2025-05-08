const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

let currentDate = new Date();
let tradesData = []; // Tous les trades
let filteredTradesData = []; // Trades du compte sélectionné seulement

async function fetchTradesData() {
  try {
    const response = await fetch('api/read_trades.php');
    tradesData = await response.json();
    populateAccountSelector(); // 🔥 ajoute ça ici
    applyAccountFilter();
    refreshCalendar();
  } catch (error) {
    console.error('Erreur de chargement des trades:', error);
  }
}

function populateAccountSelector() {
  const accountSelect = document.getElementById('calendarAccountSelect');
  const uniqueAccounts = [...new Set(tradesData.map(t => t.account))];

  uniqueAccounts.forEach(account => {
    const opt = document.createElement('option');
    opt.value = account;
    opt.textContent = account;
    accountSelect.appendChild(opt);
  });

  // 🔥 Quand l'utilisateur change de compte
  accountSelect.addEventListener('change', () => {
    const selected = accountSelect.value;
    if (selected === 'All') {
      localStorage.removeItem('currentAccount');
    } else {
      localStorage.setItem('currentAccount', selected);
    }
    refreshCalendar(); // 🔥 Recharge la vue
  });

  // 🔥 Préselectionner si currentAccount existe
  const savedAccount = localStorage.getItem('currentAccount');
  if (savedAccount && uniqueAccounts.includes(savedAccount)) {
    accountSelect.value = savedAccount;
  }
}


function applyAccountFilter() {
  const currentAccount = localStorage.getItem('currentAccount');

  if (!currentAccount || currentAccount === "All") {
    filteredTradesData = tradesData; // 🔥 Afficher tous les trades
    return;
  }

  filteredTradesData = tradesData.filter(t => t.account === currentAccount);
}


function updateAccountDisplay() {
  const currentAccount = localStorage.getItem('currentAccount');
  const display = document.getElementById('currentAccountDisplay');

  if (currentAccount) {
    display.textContent = `Compte actuel : ${currentAccount}`;
  } else {
    display.textContent = "Aucun compte sélectionné";
  }
}

function generateCalendar(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const start = (firstDay === 0) ? 6 : firstDay - 1;

  // Jours vides au début du mois
  for (let i = 0; i < start; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    calendar.appendChild(empty);
  }

  // Jours du mois
  for (let d = 1; d <= daysInMonth; d++) {
    const day = document.createElement('div');
    day.className = 'day';

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = d;

    const profitBox = document.createElement('div');
    profitBox.className = 'profit-box';

    const tradesCountBox = document.createElement('div');
    tradesCountBox.className = 'trades-count';

    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const tradesToday = filteredTradesData.filter(t => t.timestamp && t.timestamp.startsWith(dayStr));
    const profitToday = tradesToday.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);

    if (tradesToday.length > 0) {
      profitBox.textContent = (profitToday >= 0 ? '+' : '') + profitToday.toFixed(2) + '€';
      tradesCountBox.textContent = `${tradesToday.length} trade${tradesToday.length > 1 ? 's' : ''}`;

      if (profitToday >= 0) {
        day.classList.add('profit-positive');
      } else {
        day.classList.add('profit-negative');
      }
    } else {
      profitBox.textContent = '-';
      tradesCountBox.textContent = '0 trade';
    }

    // Marquer aujourd'hui
    const today = new Date();
    if (
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      day.classList.add('today');
    }

    day.appendChild(dayNumber);
    day.appendChild(profitBox);
    day.appendChild(tradesCountBox);
    calendar.appendChild(day);
  }

  document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;
}

function refreshCalendar() {
  applyAccountFilter();
  updateAccountDisplay(); // 🔥 Ajout de l'affichage compte actif
  generateCalendar(currentDate);
}


document.getElementById('prev').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  refreshCalendar();
});

document.getElementById('next').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  refreshCalendar();
});

// Charger trades + afficher calendrier au démarrage
fetchTradesData();
