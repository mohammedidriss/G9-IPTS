// tab-dashboard.js — Dashboard module for IPTS

// Fix 1: Module-level chart instance for safe re-initialization
let _volumeChartInstance = null;

async function loadClientTransactions() {
  // Fix 4: null-check DOM element
  const list = document.getElementById('clientTxList');
  if (!list) return;
  try {
    // Fix 5: pagination — limit=50, offset=0; show "Load more" if full page returned
    const data = await apiFetch('/api/transactions?limit=50&offset=0');
    const txs = (data.transactions || []).filter(function(t) {
      return t.sender_username === USER || t.receiver_username === USER || t.sender === FULL_NAME;
    });
    if (!txs.length) {
      list.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">No transactions yet.</p>';
      return;
    }
    list.innerHTML = txs.map(function(t) {
      const isOut = (t.sender_username === USER || t.sender === FULL_NAME);
      const sign  = isOut ? '-' : '+';
      const color = isOut ? 'text-red-500' : 'text-green-500';
      const icon  = isOut ? 'fa-arrow-up-right text-red-400' : 'fa-arrow-down-left text-green-400';
      const label = isOut ? (t.beneficiary_name || t.receiver || 'Transfer') : ('From ' + (t.sender || 'Transfer'));
      const statusBadge = t.status === 'blocked' ? '<span class="text-xs text-red-400 font-medium">Blocked</span>' :
                          t.status === 'flagged'  ? '<span class="text-xs text-yellow-500 font-medium">Flagged</span>' : '';
      const date = t.created_at ? t.created_at.slice(0,10) : '';
      return '<div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">' +
        '<div class="flex items-center gap-3">' +
          '<div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><i class="fas ' + icon + ' text-xs"></i></div>' +
          '<div><p class="text-xs font-medium text-gray-800">' + label + '</p>' +
               '<p class="text-xs text-gray-400">' + date + ' ' + statusBadge + '</p></div>' +
        '</div>' +
        '<span class="text-sm font-semibold ' + color + '">' + sign + '$' + Number(t.amount).toLocaleString('en-US', {minimumFractionDigits:2}) + '</span>' +
      '</div>';
    }).join('');
    // Fix 5: Show "Load more" hint if full page returned
    if (txs.length === 50) {
      list.innerHTML += '<p class="text-xs text-accent text-center py-2 cursor-pointer hover:underline" onclick="loadClientTransactions()">Load more...</p>';
    }
  } catch(e) {
    list.innerHTML = '<p class="text-xs text-red-400 text-center py-4">Could not load transactions.</p>';
    console.error('loadClientTransactions error:', e);
  }
}

async function loadDashboard() {
  try {
    const data = await apiFetch('/api/dashboard');

    // Fix 4: null-check each DOM element before writing
    const kpiTotal     = document.getElementById('kpiTotal');
    const kpiBlocked   = document.getElementById('kpiBlocked');
    const kpiFlagged   = document.getElementById('kpiFlagged');
    const kpiLiquidity = document.getElementById('kpiLiquidity');
    if (kpiTotal)     kpiTotal.textContent     = data.total_settlements || 0;
    if (kpiBlocked)   kpiBlocked.textContent   = data.blocked || 0;
    if (kpiFlagged)   kpiFlagged.textContent   = data.flagged || 0;
    if (kpiLiquidity) kpiLiquidity.textContent = '$' + Number(data.nostro_liquidity_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});

    ACCOUNTS = data.accounts || [];
    const subAccSection = document.getElementById('subAccountsSection');
    if (subAccSection) {
      subAccSection.style.display = ['client', 'operator'].includes(ROLE) ? '' : 'none';
    }
    loadTransactions();
    if (['client', 'operator'].includes(ROLE)) loadSubAccounts();
    loadLedger();
    loadVolumeChart();
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

async function loadSubAccounts() {
  const container = document.getElementById('subAccountCards');
  if (!container) return;
  try {
    const data = await apiFetch('/api/accounts/sub-accounts');
    const accounts = data.accounts || [];
    if (accounts.length === 0) {
      container.innerHTML = '<span class="text-gray-500">No sub-accounts found.</span>';
      return;
    }
    const icons  = { checking: 'fa-money-check', savings: 'fa-piggy-bank', business: 'fa-briefcase', vault: 'fa-vault' };
    const colors = { checking: 'text-accent', savings: 'text-blue-400', business: 'text-purple-400', vault: 'text-yellow-400' };
    container.innerHTML = accounts.map(a => `
      <div class="bg-gray-100 rounded-lg p-3 border border-gray-200 hover:border-accent/30 transition cursor-pointer">
        <div class="flex items-center gap-2 mb-2">
          <i class="fas ${icons[a.account_type] || 'fa-wallet'} ${colors[a.account_type] || 'text-gray-400'}"></i>
          <span class="font-semibold text-gray-800 capitalize">${a.account_type}</span>
          <span class="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-400 uppercase">${a.currency}</span>
        </div>
        <p class="text-lg font-mono text-gray-800">$${Number(a.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        <p class="text-[10px] text-gray-500 mt-1 font-mono">ACC-${a.id}</p>
      </div>
    `).join('');
  } catch (e) {
    console.error('Sub-accounts error:', e);
    container.innerHTML = '<span class="text-red-400 text-sm">Could not load sub-accounts.</span>';
  }
}

async function loadLedger() {
  const tbody = document.getElementById('dashLedgerBody');
  if (!tbody) return;
  try {
    const data = await apiFetch('/api/ledger?page=1&per_page=10');
    const entries = data.transactions || [];
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-600">No ledger entries yet. Execute a settlement to begin.</td></tr>';
      return;
    }
    // Fix 6: Use server-provided running balance per entry if available; fall back to current balance
    const currentBal = data.balance_current || BALANCE;
    tbody.innerHTML = entries.map(e => {
      // Prefer server-side per-entry balance if provided
      const runningBalance = e.balance !== undefined ? e.balance : currentBal;
      const isCredit  = e.direction === 'credit';
      const amtColor  = isCredit ? 'text-green-400' : 'text-red-400';
      const amtPrefix = isCredit ? '+' : '-';
      const statusColor = e.status === 'settled' ? 'text-accent' : e.status === 'blocked' ? 'text-red-400' : 'text-yellow-400';
      return `<tr class="border-b border-gray-200/30 hover:bg-gray-100/30">
        <td class="py-1.5 px-2 text-gray-500">${e.created_at || '-'}</td>
        <td class="py-1.5 px-2"><span class="px-1.5 py-0.5 rounded text-[10px] ${isCredit ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} uppercase">${e.direction}</span></td>
        <td class="py-1.5 px-2 text-gray-600">${e.counterparty || '-'} <span class="${statusColor} text-[10px] uppercase">[${e.status}]</span></td>
        <td class="py-1.5 px-2 text-right font-mono ${amtColor}">${amtPrefix}$${Number(e.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td class="py-1.5 px-2 text-right font-mono text-gray-800">$${Number(runningBalance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('Ledger error:', e);
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-400">Could not load ledger.</td></tr>';
  }
}

async function loadTransactions() {
  const tbody = document.getElementById('telemetryBody');
  if (!tbody) return;
  try {
    // Fix 5: use limit/offset pagination params
    const data = await apiFetch('/api/transactions?limit=50&offset=0');
    if (!data.transactions || data.transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-600">No transactions yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.transactions.map(tx => {
      const statusClass  = `status-${tx.status}`;
      const rowBg        = tx.status === 'blocked' ? 'bg-red-500/5' : tx.status === 'flagged' ? 'bg-yellow-500/5' : 'bg-green-500/5';
      const shortHash    = tx.tx_hash ? tx.tx_hash.substring(0, 12) + '...' : 'N/A';
      const senderDisplay = tx.sender || 'N/A';
      const benefDisplay  = tx.beneficiary_name || 'N/A';
      return `<tr class="${rowBg} border-b border-gray-200/50 hover:bg-gray-50">
        <td class="py-2 px-2">${tx.created_at || '-'}</td>
        <td class="py-2 px-2">${senderDisplay.length > 20 ? senderDisplay.substring(0, 18) + '...' : senderDisplay}</td>
        <td class="py-2 px-2">${benefDisplay.length > 20 ? benefDisplay.substring(0, 18) + '...' : benefDisplay}</td>
        <td class="py-2 px-2 text-right">$${Number(tx.amount).toLocaleString()}</td>
        <td class="py-2 px-2 text-right font-mono ${tx.risk_score >= 80 ? 'text-red-400' : tx.risk_score >= 60 ? 'text-yellow-400' : 'text-green-400'}">${(tx.risk_score || 0).toFixed(1)}</td>
        <td class="py-2 px-2 text-center"><span class="${statusClass} uppercase font-medium">${tx.status}</span></td>
        <td class="py-2 px-2 font-mono text-gray-500">${shortHash}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('Transactions error:', e);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-400">Could not load transactions.</td></tr>';
  }
}

function initVolumeChart(labels = [], settled = [], blocked = []) {
  const ctx = document.getElementById('volumeChart');
  if (!ctx) return;
  // Fix 1: Safe Chart.js re-initialization — destroy existing instance first
  if (_volumeChartInstance) {
    _volumeChartInstance.destroy();
    _volumeChartInstance = null;
  }
  _volumeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Settled',
        data: settled,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      }, {
        label: 'Blocked',
        data: blocked,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.10)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      }]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#6b7280', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} txns`
          }
        }
      },
      scales: {
        x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: 'rgba(107,114,128,0.15)' } },
        y: {
          beginAtZero: true,
          ticks: { color: '#9ca3af', font: { size: 10 }, stepSize: 1, precision: 0 },
          grid: { color: 'rgba(107,114,128,0.15)' }
        }
      }
    }
  });
}

async function loadVolumeChart() {
  try {
    const data = await apiFetch('/api/analytics/volume-history?days=14');
    initVolumeChart(data.labels || [], data.settled || [], data.blocked || []);
  } catch (e) {
    console.error('Volume chart error:', e);
    initVolumeChart();
  }
}

function pushChartData(status) {
  if (!_volumeChartInstance) { loadVolumeChart(); return; }
  const settled = _volumeChartInstance.data.datasets[0].data;
  const blocked = _volumeChartInstance.data.datasets[1].data;
  if (settled.length === 0) { loadVolumeChart(); return; }
  const idx = settled.length - 1;
  if (status === 'blocked' || status === 'BLOCKED') {
    blocked[idx] = (blocked[idx] || 0) + 1;
  } else {
    settled[idx] = (settled[idx] || 0) + 1;
  }
  _volumeChartInstance.update();
}

async function loadFraudHeatmap() {
  const container = document.getElementById('fraudHeatmapContainer');
  // Fix 4: null-check before use
  if (!container) return;
  try {
    const data = await apiFetch('/api/analytics/fraud-heatmap');
    if (!data.length) { container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No fraud data available</p>'; return; }
    let html = '<div class="grid grid-cols-2 md:grid-cols-4 gap-2">';
    data.forEach(d => {
      const riskColor = d.avg_risk >= 80 ? 'text-red-400 bg-red-500/10' : d.avg_risk >= 70 ? 'text-orange-400 bg-orange-500/10' : 'text-yellow-400 bg-yellow-500/10';
      html += `<div class="rounded-lg p-3 ${riskColor}">
        <div class="text-xs font-bold">${d.name}</div>
        <div class="text-lg font-bold mt-1">${d.count} <span class="text-xs font-normal">alerts</span></div>
        <div class="text-xs mt-1">Avg Risk: ${d.avg_risk}</div>
        <div class="text-xs">Volume: $${Number(d.total_amount).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch(e) {
    console.error('Heatmap error', e);
    container.innerHTML = '<p class="text-red-400 text-sm text-center py-4">Could not load fraud heatmap.</p>';
  }
}

// Fix 2: Guard fetchAccountInfo calls — only call if function is defined
function safeFetchAccountInfo() {
  if (typeof fetchAccountInfo === 'function') fetchAccountInfo();
}
