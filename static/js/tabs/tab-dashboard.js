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
      subAccSection.style.display = ROLE === 'client' ? '' : 'none';
    }
    loadTransactions();
    if (ROLE === 'client') loadSubAccounts();
    loadLedger();
    loadVolumeChart();

    const acc = document.getElementById('adminCommandCenter');
    const clientWelcome = document.getElementById('clientDashWelcome');
    const clientTx = document.getElementById('dashClientTransactions');
    if (['admin', 'compliance', 'operator', 'auditor', 'datascientist'].includes(ROLE)) {
      if (acc) acc.classList.remove('hidden');
      if (clientTx) clientTx.classList.add('hidden');
      if (clientWelcome) clientWelcome.classList.add('hidden');
      loadAdminCommandCenter();
    } else {
      if (acc) acc.classList.add('hidden');
      if (clientTx) clientTx.classList.remove('hidden');
      if (clientWelcome) {
        clientWelcome.classList.remove('hidden');
        const span = clientWelcome.querySelector('span');
        if (span) span.textContent = FULL_NAME || USER;
      }
      loadClientTransactions();
    }
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

async function loadAdminCommandCenter() {
  try {
    const d = await apiFetch('/api/dashboard/admin-summary');

    // HITL card
    const hitlCount = document.getElementById('accHitlCount');
    const hitlAwaiting = document.getElementById('accHitlAwaiting');
    const hitlAge = document.getElementById('accHitlAge');
    if (hitlCount) hitlCount.textContent = d.hitl.total_active;
    if (hitlAwaiting) hitlAwaiting.textContent = d.hitl.awaiting_second;
    if (hitlAge) {
      if (d.hitl.oldest_age_h !== null) {
        hitlAge.classList.remove('hidden');
        hitlAge.querySelector('span').textContent = d.hitl.oldest_age_h;
      } else {
        hitlAge.classList.add('hidden');
      }
    }
    // colour code — red if anything pending
    if (hitlCount) hitlCount.className = 'text-3xl font-bold mt-1 ' + (d.hitl.total_active > 0 ? 'text-orange-400' : 'text-green-400');

    // Cases card
    const casesCount = document.getElementById('accCasesCount');
    if (casesCount) casesCount.textContent = d.cases.total_open;
    const sevMap = { critical: ['accCasesCritical', 'Critical'], high: ['accCasesHigh', 'High'], medium: ['accCasesMedium', 'Medium'], low: ['accCasesLow', 'Low'] };
    Object.entries(sevMap).forEach(([key, [elId, label]]) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const n = d.cases.by_severity[key] || 0;
      if (n > 0) { el.textContent = n + ' ' + label; el.classList.remove('hidden'); }
      else el.classList.add('hidden');
    });

    // AML card
    const amlCount = document.getElementById('accAmlCount');
    const amlHigh  = document.getElementById('accAmlHigh');
    const amlNew   = document.getElementById('accAmlNew');
    const total = d.aml.high_risk + d.aml.elevated_risk;
    if (amlCount) amlCount.textContent = total;
    if (amlHigh)  amlHigh.textContent  = d.aml.high_risk;
    if (amlNew)   amlNew.textContent   = d.aml.new_24h;

    // System health strip
    const bcDot   = document.getElementById('sysBlockchainDot');
    const bcLabel = document.getElementById('sysBlockchainLabel');
    const modelAcc = document.getElementById('sysModelAcc');
    const lastTx   = document.getElementById('sysLastTx');
    if (bcDot && bcLabel) {
      if (d.system.blockchain_connected) {
        bcDot.className = 'w-2 h-2 rounded-full bg-green-400';
        bcLabel.textContent = 'Blockchain connected';
        bcLabel.className = 'text-green-400';
      } else {
        bcDot.className = 'w-2 h-2 rounded-full bg-red-400';
        bcLabel.textContent = 'Blockchain offline';
        bcLabel.className = 'text-red-400';
      }
    }
    if (modelAcc) modelAcc.textContent = d.system.model_accuracy !== null ? d.system.model_accuracy + '%' : '—';
    if (lastTx)   lastTx.textContent   = d.system.last_tx ? d.system.last_tx.slice(0, 16).replace('T', ' ') : '—';

    // Activity feed
    const feed = document.getElementById('accActivityFeed');
    if (feed) {
      if (!d.recent_activity.length) {
        feed.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">No recent activity.</p>';
      } else {
        const icons = { SETTLEMENT: 'fa-receipt text-accent', LOGIN: 'fa-sign-in-alt text-green-400', BLOCK: 'fa-ban text-red-400', APPROVAL: 'fa-check-circle text-blue-400', FLAG: 'fa-flag text-yellow-400' };
        feed.innerHTML = d.recent_activity.map(a => {
          const iconKey = Object.keys(icons).find(k => (a.event || '').toUpperCase().includes(k)) || 'SETTLEMENT';
          const icon = icons[iconKey] || 'fa-bolt text-gray-400';
          const time = a.time ? a.time.slice(0, 16).replace('T', ' ') : '';
          return `<div class="flex items-start gap-3 py-1.5 border-b border-gray-100 last:border-0">
            <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i class="fas ${icon} text-[10px]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-700 truncate">${a.event || '—'}</p>
              <p class="text-[10px] text-gray-400">${a.actor || ''} · ${time}</p>
            </div>
          </div>`;
        }).join('');
      }
    }

    // Proof of Reserve card
    try {
      const por = await apiFetch('/api/defi/proof-of-reserve');
      const porRatio    = document.getElementById('accPorRatio');
      const porOffchain = document.getElementById('accPorOffchain');
      const porOnchain  = document.getElementById('accPorOnchain');
      const porBadge    = document.getElementById('accPorBadge');
      const porIcon     = document.getElementById('accPorIcon');
      const porCard     = document.getElementById('accPorCard');
      const fmt = n => '$' + Number(n || 0).toLocaleString('en-US', {maximumFractionDigits: 0});
      if (porRatio)    porRatio.textContent    = (por.ratio !== null ? (por.ratio * 100).toFixed(1) + '%' : '—');
      if (porOffchain) porOffchain.textContent = fmt(por.offchain_total);
      if (porOnchain)  porOnchain.textContent  = fmt(por.onchain_total);
      const backed = por.backed;
      if (porBadge) {
        porBadge.textContent  = backed ? '✓ Fully Backed' : '⚠ Under-Collateralised';
        porBadge.className    = 'text-xs px-2 py-0.5 rounded-full font-semibold ' +
          (backed ? 'bg-teal-500/20 text-teal-500' : 'bg-red-500/20 text-red-400');
      }
      if (porRatio) porRatio.className = 'text-3xl font-bold mt-1 ' + (backed ? 'text-teal-400' : 'text-red-400');
      if (porIcon)  porIcon.className  = 'fas ' + (backed ? 'fa-shield-halved text-teal-400' : 'fa-shield-exclamation text-red-400');
      if (porCard)  porCard.className  = porCard.className.replace(/border-[a-z]+-400/, backed ? 'border-teal-400' : 'border-red-400');
    } catch (_) { /* PoR fetch failed silently */ }

  } catch (e) {
    console.error('Admin command center error:', e);
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

// loadTransactions() lives in core.js — full explorer with search/filter/pagination

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
