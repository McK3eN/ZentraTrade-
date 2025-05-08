let allTrades = [];
let profitChart = null;

// Charger les trades
fetch("api/read_trades.php")
  .then(res => res.json())
  .then(data => {
    allTrades = data;
    setupAccountSelector();
    setupMonthSelector();
    updateStatistics();
  })
  .catch(err => console.error("❌ Erreur chargement trades :", err));

// Fonction pour remplir le sélecteur de comptes
function setupAccountSelector() {
  const accountSelect = document.getElementById('accountSelect');
  const accounts = [...new Set(allTrades.map(t => t.account))];

  accounts.forEach(account => {
    const opt = document.createElement('option');
    opt.value = account;
    opt.textContent = account;
    accountSelect.appendChild(opt);
  });

  // 🔥 Synchroniser avec currentAccount dans localStorage
  const currentAccount = localStorage.getItem('currentAccount');
  if (currentAccount) {
    accountSelect.value = currentAccount;
  }

  accountSelect.addEventListener('change', function() {
    const selectedAccount = accountSelect.value;
    localStorage.setItem('currentAccount', selectedAccount); // 🔥 Mettre à jour localStorage si changement manuel
    updateStatistics();
  });
}


// Fonction pour initialiser le filtre de mois
function setupMonthSelector() {
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    monthSelect.value = `${year}-${month}`;

    monthSelect.addEventListener('change', updateStatistics);
  }
}

// Fonction pour filtrer les trades selon mois + compte
function filterTrades() {
  const monthSelect = document.getElementById('monthSelect');
  const accountSelect = document.getElementById('accountSelect');
  const selectedMonth = monthSelect ? monthSelect.value : '';
  const selectedAccount = accountSelect ? accountSelect.value : 'All';

  return allTrades.filter(trade => {
    const date = new Date(trade.timestamp);
    const tradeMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const matchMonth = !selectedMonth || tradeMonth === selectedMonth;
    const matchAccount = selectedAccount === 'All' || trade.account === selectedAccount;
    return matchMonth && matchAccount;
  });
}

// Fonction pour calculer et afficher les stats
function updateStatistics() {
  const trades = filterTrades();
  const statisticsTable = document.getElementById('statisticsTable');
  statisticsTable.innerHTML = '';

  if (trades.length === 0) {
    statisticsTable.innerHTML = '<tr><td colspan="2" class="text-center">Aucun trade disponible</td></tr>';
    if (profitChart) profitChart.destroy();
    return;
  }

  let totalTrades = trades.length;
  let wins = trades.filter(t => t.result === 'WIN');
  let losses = trades.filter(t => t.result !== 'WIN');

  let totalProfit = wins.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
  let totalLoss = losses.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);

  let biggestWin = Math.max(...wins.map(t => parseFloat(t.profit) || 0), 0);
  let biggestLoss = Math.min(...losses.map(t => parseFloat(t.profit) || 0), 0);

  let avgWin = wins.length > 0 ? totalProfit / wins.length : 0;
  let avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;

  let winRate = (wins.length / totalTrades) * 100;
  let profitFactor = totalLoss !== 0 ? totalProfit / Math.abs(totalLoss) : 0;

  const stats = [
    ['Nombre total de trades', totalTrades],
    ['Win Rate (%)', winRate.toFixed(2) + '%'],
    ['Gain moyen (€)', avgWin.toFixed(2) + ' €'],
    ['Perte moyenne (€)', avgLoss.toFixed(2) + ' €'],
    ['Plus gros gain (€)', biggestWin.toFixed(2) + ' €'],
    ['Plus grosse perte (€)', biggestLoss.toFixed(2) + ' €'],
    ['Profit Factor', profitFactor.toFixed(2)],
  ];

  stats.forEach(([label, value]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td>${value}</td>`;
    statisticsTable.appendChild(tr);
  });

  updateProfitChart(trades);
}

// Fonction pour créer/mettre à jour le graphique du profit
function updateProfitChart(trades) {
  const ctx = document.getElementById('profitChart').getContext('2d');

  const profitByDate = {};

  trades.forEach(trade => {
    const dateStr = trade.timestamp ? trade.timestamp.slice(0, 10) : '';
    if (dateStr) {
      if (!profitByDate[dateStr]) profitByDate[dateStr] = 0;
      profitByDate[dateStr] += parseFloat(trade.profit) || 0;
    }
  });

  const labels = Object.keys(profitByDate).sort();
  const data = labels.map(date => profitByDate[date]);

  if (profitChart) {
    profitChart.destroy();
  }

  profitChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Profit par jour (€)',
        data,
        fill: true,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        pointRadius: 4, 
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true, // ✅ Graphique réactif
      maintainAspectRatio: true, // ✅ Garde exactement ta taille initiale
      scales: {
        x: {
          title: { display: true, text: 'Jour' },
          ticks: {
            autoSkip: false, 
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Profit (€)' },
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' €';
            }
          }
        }
      }
    }
  });
}

