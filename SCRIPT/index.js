let daily = 0, weekly = 0, monthly = 0;
let allTrades = [];
let availableAccounts = [];
let configuredAccounts = JSON.parse(localStorage.getItem('configureAccounts')) || [];

const now = new Date();
const today = now.toISOString().slice(0, 10);

const weekStart = new Date();
const day = weekStart.getDay();
const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
weekStart.setDate(diff);
weekStart.setHours(0, 0, 0, 0);

const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// Elements
const select = document.getElementById('accountSelect');
const accountsTbody = document.getElementById('accountsTable');
const tradesTbody = document.getElementById('tradeHistory');
const paginationDiv = document.getElementById('pagination');

let currentPage = 1;
const tradesPerPage = 15;
let filteredTrades = [];

// 🔥 Recharge config
function reloadConfiguredAccounts() {
  configuredAccounts = JSON.parse(localStorage.getItem('configureAccounts')) || [];
}

// 🔥 Fonction pour récupérer la config spécifique du compte
function getAccountConfig(accountName) {
  return configuredAccounts.find(acc => acc.accountName === accountName || acc.account === accountName);
}

// 🔥 Fonction principale pour tout mettre à jour
function updateAll(selectedAccount) {
  reloadConfiguredAccounts();
  updateAccountsOverview(selectedAccount);
  updateTradeHistory(selectedAccount);
  updateGoals(selectedAccount);
}

// 🔥 Fetch de tes trades
fetch("api/read_trades.php")
  .then(res => res.json())
  .then(data => {
    allTrades = data;

    select.innerHTML = '';
    availableAccounts = [...new Set(allTrades.map(trade => trade.account))];

    availableAccounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc;
      opt.textContent = acc;
      select.appendChild(opt);
    });

    // 🔥 Très important : trouver compte sauvé dans localStorage
    let accountToSelect = localStorage.getItem('currentAccount');

    if (!accountToSelect || !availableAccounts.includes(accountToSelect)) {
      // Si pas trouvé ou mauvais compte ➔ prendre premier compte
      accountToSelect = availableAccounts[0];
      localStorage.setItem('currentAccount', accountToSelect);
    }

    // 🔥 Maintenant que accountToSelect est BON ➔ l'appliquer dans le select
    select.value = accountToSelect;

    // 🔥 Mise à jour initiale propre
    currentPage = 1;
    updateAll(accountToSelect);

    // 🔥 À CHAQUE changement manuel d'utilisateur
    select.addEventListener('change', () => {
      currentPage = 1;
      const selectedAccount = select.value;
      localStorage.setItem('currentAccount', selectedAccount);
      updateAll(selectedAccount);
    });

  })
  .catch(err => console.error("❌ Erreur chargement données :", err));

// 🔥 Update Accounts Overview
function updateAccountsOverview(selectedAccount) {
  accountsTbody.innerHTML = '';

  const accountTrades = allTrades.filter(t => t.account === selectedAccount);
  const config = getAccountConfig(selectedAccount);

  const profit = accountTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);
  const initialCapital = config ? parseFloat(config.initialCapital) : 10000;
  const dynamicCapital = initialCapital + profit;
  const percentage = initialCapital > 0 ? (profit / initialCapital) * 100 : 0;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${selectedAccount}</td>
    <td>${dynamicCapital.toFixed(2)} €</td>
    <td>${profit.toFixed(2)} €</td>
    <td>${percentage.toFixed(2)} %</td>
  `;
  accountsTbody.appendChild(tr);
}

// 🔥 Update historique trades
function updateTradeHistory(selectedAccount) {
  tradesTbody.innerHTML = '';
  paginationDiv.innerHTML = '';

  filteredTrades = allTrades.filter(t => t.account === selectedAccount);

  const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);
  const start = (currentPage - 1) * tradesPerPage;
  const end = start + tradesPerPage;
  const pageTrades = filteredTrades.slice(start, end);

  pageTrades.forEach(trade => {
    const profit = parseFloat(trade.profit || 0);
    const resultColor = trade.result === "WIN" ? "text-success" : "text-danger";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${trade.timestamp || ''}</td>
      <td>${trade.instrument || ''}</td>
      <td class="${resultColor}">${trade.result || ''}</td>
      <td>${trade.direction || ''}</td>
      <td>${profit.toFixed(2)}</td>
      <td>${trade.account || ''}</td>
    `;
    tradesTbody.appendChild(tr);
  });

  if (totalPages > 1) {
    if (currentPage > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.textContent = "⬅️";
      prevBtn.className = "btn btn-primary me-2";
      prevBtn.onclick = () => {
        currentPage--;
        updateTradeHistory(selectedAccount);
      };
      paginationDiv.appendChild(prevBtn);
    }

    if (currentPage < totalPages) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = "➡️";
      nextBtn.className = "btn btn-primary";
      nextBtn.onclick = () => {
        currentPage++;
        updateTradeHistory(selectedAccount);
      };
      paginationDiv.appendChild(nextBtn);
    }
  }
}

// 🔥 Update objectifs Daily, Weekly, Monthly
function updateGoals(selectedAccount) {
  const accountTrades = allTrades.filter(t => t.account === selectedAccount);
  const config = getAccountConfig(selectedAccount);

  let profitToday = 0, profitWeek = 0, profitMonth = 0;

  accountTrades.forEach(trade => {
    const ts = trade.timestamp || "";
    const profit = parseFloat(trade.profit || 0);
    const date = new Date(ts);

    if (ts.startsWith(today)) profitToday += profit;
    if (date >= weekStart) profitWeek += profit;
    if (date >= monthStart) profitMonth += profit;
  });

  document.getElementById("totalProfit").innerText = accountTrades.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0).toFixed(2) + " €";

  const dailyGoal = config ? config.dailyGoal : daily;
  const weeklyGoal = config ? config.weeklyGoal : weekly;
  const monthlyGoal = config ? config.monthlyGoal : monthly;

  document.getElementById("dailyGoal").innerText = `€${profitToday.toFixed(2)} / €${dailyGoal}`;
  document.getElementById("weeklyGoal").innerText = `€${profitWeek.toFixed(2)} / €${weeklyGoal}`;
  document.getElementById("monthlyGoal").innerText = `€${profitMonth.toFixed(2)} / €${monthlyGoal}`;

  const dailyPct = dailyGoal > 0 ? (profitToday / dailyGoal) * 100 : 0;
  const weeklyPct = weeklyGoal > 0 ? (profitWeek / weeklyGoal) * 100 : 0;
  const monthlyPct = monthlyGoal > 0 ? (profitMonth / monthlyGoal) * 100 : 0;

  document.getElementById("dailyGoalBar").style.width = dailyPct.toFixed(0) + "%";
  document.getElementById("dailyGoalBar").innerText = dailyPct.toFixed(0) + "%";

  document.getElementById("weeklyGoalBar").style.width = weeklyPct.toFixed(0) + "%";
  document.getElementById("weeklyGoalBar").innerText = weeklyPct.toFixed(0) + "%";

  document.getElementById("monthlyGoalBar").style.width = monthlyPct.toFixed(0) + "%";
  document.getElementById("monthlyGoalBar").innerText = monthlyPct.toFixed(0) + "%";
}
