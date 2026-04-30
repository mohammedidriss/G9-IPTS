// ============================================================
// core.js — IPTS shared utilities, auth, dashboard, FX, SSE
// NOTE: TOKEN, USER, ROLE, FULL_NAME, BALANCE, API and the vars below
//       are declared in index.html before this file loads.
// ============================================================
// (ACCOUNTS, BENEFICIARY_LIST, ALL_BENEFICIARIES, volumeChart, featureChart,
//  shapChart, lastShapValues, sseSource, FX_RATES, healthInterval,
//  _sessionTimer, _sessionWarnTimer are declared in index.html global block)

// ============================================================
// Toast utility
// ============================================================
function showToast(msg, type = 'info') {
  const colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-500', info: 'bg-blue-600' };
  const t = document.createElement('div');
  t.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] ${colors[type]||colors.info} text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 fade-in`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ============================================================
// Auth
// ============================================================
async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const resp = await fetch(API + url, { ...options, headers });
  if (resp.status === 401) { doLogout(); throw new Error('Unauthorized'); }
  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const err = new Error(errData.error || `HTTP ${resp.status}`);
    err.data = errData;
    throw err;
  }
  return resp.json();
}

async function doLogin() {
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;
  try {
    const data = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.token) {
      TOKEN = data.token;
      USER = data.username;
      ROLE = data.role;
      FULL_NAME = data.full_name || data.username;
      localStorage.setItem('ipts_token', TOKEN);
      localStorage.setItem('ipts_user', USER);
      localStorage.setItem('ipts_role', ROLE);
      localStorage.setItem('ipts_fullname', FULL_NAME);
      if (data.refresh_token) localStorage.setItem('ipts_refresh_token', data.refresh_token);
      if (data.tx_limits) showTxLimits(data.tx_limits);
      await fetchAccountInfo();
      showApp();
      if (data.must_change_password) {
        setTimeout(() => {
          const modal = document.getElementById('forceChangePasswordModal');
          if (modal) modal.classList.remove('hidden');
        }, 800);
      }
    } else {
      const msg = data.error || 'Login failed';
      showLoginError(msg);
    }
  } catch (e) {
    const msg = (e.data && e.data.error) ? e.data.error : (e.message || 'Connection error');
    showLoginError(msg);
  }
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  if (!el) return;
  const isLocked = msg.toLowerCase().includes('locked');
  el.innerHTML = isLocked
    ? `<span><i class="fas fa-lock mr-1"></i>${msg}</span>`
    : `<span><i class="fas fa-exclamation-circle mr-1"></i>${msg}</span>`;
  el.className = isLocked
    ? 'text-sm text-center mt-2 px-3 py-2 rounded-lg bg-red-100 border border-red-300 text-red-700 font-medium'
    : 'text-sm text-center mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-500';
  el.classList.remove('hidden');
  // Clear password field for security
  const passEl = document.getElementById('loginPass');
  if (passEl) passEl.value = '';
}

async function fetchAccountInfo() {
  try {
    const acct = await apiFetch('/api/accounts/me');
    FULL_NAME = acct.full_name || USER;
    BALANCE = acct.balance || 0;
    localStorage.setItem('ipts_fullname', FULL_NAME);
    localStorage.setItem('ipts_balance', BALANCE.toString());
    updateHeaderInfo();
  } catch (e) { console.error('Account fetch error:', e); }
}

function updateHeaderInfo() {
  document.getElementById('headerFullName').textContent = FULL_NAME;
  const badge = document.getElementById('headerRoleBadge');
  badge.textContent = ROLE.toUpperCase();
  badge.className = `badge role-badge-${ROLE}`;
  const balEl = document.getElementById('headerBalance');
  const rolesWithBalance = ['client', 'operator'];
  if (rolesWithBalance.includes(ROLE)) {
    balEl.textContent = `$${Number(BALANCE).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    balEl.parentElement.style.display = '';
  } else {
    balEl.textContent = '';
    balEl.parentElement.style.display = 'none';
  }
}

function configureUIForRole() {
  const tabAccess = {
    admin:         ['dashboard', 'approvals', 'aiml', 'compliance', 'cases', 'security', 'cards', 'admin', 'ledger', 'aml', 'corridors', 'dsworkbench', 'graph', 'mlops', 'defi'],
    compliance:    ['dashboard', 'approvals', 'aiml', 'compliance', 'cases', 'security', 'ledger', 'aml', 'graph'],
    operator:      ['dashboard', 'approvals', 'security', 'cards', 'ledger', 'corridors'],
    auditor:       ['dashboard', 'aiml', 'compliance', 'cases', 'ledger', 'aml', 'graph'],
    datascientist: ['dashboard', 'aiml', 'ledger', 'aml', 'dsworkbench', 'graph', 'mlops'],
    client:        ['dashboard', 'beneficiaries', 'payments', 'security', 'cards', 'documents', 'spending360', 'defi'],
  };

  const allowed = tabAccess[ROLE] || null;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const tab = btn.getAttribute('data-tab');
    if (allowed === null) {
      btn.style.display = '';
    } else if (allowed.includes(tab)) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });

  const clientInsights = document.getElementById('clientAIInsights');
  const fullAIML = document.querySelectorAll('#tab-aiml > *:not(#clientAIInsights)');
  if (ROLE === 'client') {
    clientInsights.classList.remove('hidden');
    fullAIML.forEach(el => el.style.display = 'none');
    document.getElementById('clientWelcomeName').textContent = FULL_NAME;
    const aimlBtn = document.querySelector('[data-tab="aiml"]');
    if (aimlBtn) aimlBtn.innerHTML = '<i class="fas fa-sparkles mr-1"></i>AI Insights';
  } else {
    clientInsights.classList.add('hidden');
    fullAIML.forEach(el => el.style.display = '');
  }

  const adminOnlySections = ['adminSystemStats', 'adminUserMgmt'];
  const hitlSection = document.querySelector('#tab-admin .glass:first-child');
  const gdprSection = document.getElementById('gdprEntityId')?.closest('.glass');
  if (ROLE === 'compliance') {
    if (hitlSection) hitlSection.style.display = 'none';
    if (gdprSection) gdprSection.style.display = 'none';
    adminOnlySections.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  } else if (ROLE === 'admin') {
    if (hitlSection) hitlSection.style.display = '';
    if (gdprSection) gdprSection.style.display = '';
    adminOnlySections.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  }

  const dashWelcome = document.getElementById('clientDashWelcome');
  if (dashWelcome) {
    if (ROLE === 'client') {
      dashWelcome.style.display = '';
      dashWelcome.querySelector('span').textContent = FULL_NAME;
    } else {
      dashWelcome.style.display = 'none';
    }
  }

  const cardAdminPanel   = document.getElementById('cardAdminPanel');
  const cardRequestPanel = document.getElementById('cardRequestPanel');
  if (ROLE === 'admin') {
    if (cardAdminPanel)   { cardAdminPanel.classList.remove('hidden');   cardAdminPanel.style.display   = ''; }
    if (cardRequestPanel) { cardRequestPanel.classList.add('hidden');    cardRequestPanel.style.display = 'none'; }
  } else {
    if (cardAdminPanel)   { cardAdminPanel.classList.add('hidden');      cardAdminPanel.style.display   = 'none'; }
    if (cardRequestPanel) { cardRequestPanel.classList.remove('hidden'); cardRequestPanel.style.display = ''; }
  }

  const amlLedger    = document.getElementById('dashAmlLedger');
  const amlTelemetry = document.getElementById('dashAmlTelemetry');
  const clientTx     = document.getElementById('dashClientTransactions');
  if (ROLE === 'client') {
    if (amlLedger)    amlLedger.style.display    = 'none';
    if (amlTelemetry) amlTelemetry.style.display = 'none';
    if (clientTx)     clientTx.classList.remove('hidden');
  } else {
    if (amlLedger)    amlLedger.style.display    = '';
    if (amlTelemetry) amlTelemetry.style.display = '';
    if (clientTx)     clientTx.classList.add('hidden');
  }
}

function doLogout() {
  if (TOKEN) {
    fetch(API + '/api/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }).catch(() => {});
  }
  TOKEN = ''; USER = ''; ROLE = ''; FULL_NAME = ''; BALANCE = 0;
  localStorage.removeItem('ipts_token');
  localStorage.removeItem('ipts_user');
  localStorage.removeItem('ipts_role');
  localStorage.removeItem('ipts_fullname');
  localStorage.removeItem('ipts_balance');
  localStorage.removeItem('ipts_refresh_token');
  if (sseSource) sseSource.close();
  if (healthInterval) { clearInterval(healthInterval); healthInterval = null; }
  clearTimeout(_sessionTimer); clearTimeout(_sessionWarnTimer);
  document.getElementById('sessionWarnBanner')?.classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  updateHeaderInfo();
  configureUIForRole();
  if (ROLE === 'admin') loadCardRequests();
  const retrainSection = document.getElementById('retrainSection');
  if (retrainSection) {
    retrainSection.style.display = (ROLE === 'admin' || ROLE === 'datascientist') ? '' : 'none';
  }
  loadDashboard();
  loadSlaDashboard();
  loadFXRates();
  loadNotifications();
  pollHealth();
  if (healthInterval) clearInterval(healthInterval);
  healthInterval = setInterval(pollHealth, 30000);
  setInterval(loadNotifications, 30000);
  connectSSE();
  startSessionTimer();
  // Poll maintenance mode and announcement banners
  pollMaintenanceBanner();
  pollAnnouncementBanner();
  setInterval(pollMaintenanceBanner, 30000);
  setInterval(pollAnnouncementBanner, 120000);
  switchTab('dashboard');
}

// ============================================================
// Tab Switching
// ============================================================
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('tab-active');
    el.classList.add('text-gray-500');
  });
  document.getElementById('tab-' + tab).classList.remove('hidden');
  const btn = document.querySelector(`[data-tab="${tab}"]`);
  if (btn) { btn.classList.add('tab-active'); btn.classList.remove('text-gray-500'); }

  if (tab === 'dashboard') { loadDashboard(); loadSlaDashboard(); if (ROLE === 'client') loadClientTransactions(); }
  if (tab === 'payments') {
    if (typeof switchPaySub === 'function') switchPaySub('settlement');
    if (typeof loadBeneficiaries === 'function') loadBeneficiaries();
    // Populate sender info panel
    const senderNameEl = document.getElementById('paySenderName');
    const senderBalEl  = document.getElementById('paySenderBalance');
    if (senderNameEl) senderNameEl.textContent = FULL_NAME || USER || 'Me';
    if (senderBalEl)  senderBalEl.textContent  = '$' + Number(BALANCE || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
  if (tab === 'aiml') {
    if (ROLE === 'client') { loadClientAIInsights(); }
    else {
      loadModelMetrics(); loadFraudHeatmap(); loadRiskEntities(); loadRiskTrend(); loadTxExplorer();
      // New AI Engine features
      if (typeof loadAIKpis === 'function')               loadAIKpis();
      if (typeof loadConfidenceDistribution === 'function') loadConfidenceDistribution();
      if (typeof loadDriftMonitor === 'function')           loadDriftMonitor();
      if (typeof loadVelocityHeatmap === 'function')        loadVelocityHeatmap();
      if (typeof loadCohortAnalysis === 'function')         loadCohortAnalysis();
      if (typeof loadThresholds === 'function')             loadThresholds();
    }
  }
  if (tab === 'graph') loadNetworkData();
  if (tab === 'corridors') {
    loadCorridors(); refreshCorridorMap();
    const addBtn = document.getElementById('addCorridorBtn');
    if (addBtn) addBtn.style.display = ROLE === 'admin' ? '' : 'none';
  }
  if (tab === 'dsworkbench') { loadDSWorkbench(); switchDSTab('models'); }
  if (tab === 'mlops') loadMLOps();
  if (tab === 'admin') {
    loadHITL(); loadAudit();
    if (ROLE === 'admin') {
      loadSystemStats(); loadAdminUsers();
      loadSessions(); loadFailedLogins(); loadSystemConfig(); loadAdminCorridors(); loadMaintenanceState();
      // Start auto-refresh for failed logins
      if (typeof _failedLoginInterval !== 'undefined' && _failedLoginInterval) clearInterval(_failedLoginInterval);
      if (typeof loadFailedLogins === 'function') {
        window._failedLoginInterval = setInterval(loadFailedLogins, 60000);
      }
    }
  }
  if (tab === 'compliance') { loadSanctions(); loadNostro(); loadComplianceFeatures(); loadProofOfReserve(); }
  if (tab === 'cases') { loadCases(); }
  if (tab === 'aml')    { loadAmlMonitor(); loadTransactions(); }
  if (tab === 'ledger') { loadLedgerTab(); if (typeof loadRiskTrend === 'function') loadRiskTrend(); }
  if (tab === 'beneficiaries') loadBeneficiaries();
  if (tab === 'spending360') loadSpending360();
  if (tab === 'approvals') loadApprovals();
  if (tab === 'cards') {
    loadCards();
    if (ROLE === 'admin') loadCardRequests();
    // Only clients can request a virtual card
    const cardReqPanel = document.getElementById('cardRequestPanel');
    if (cardReqPanel) cardReqPanel.style.display = ROLE === 'client' ? '' : 'none';
  }
  if (tab === 'security') { loadSecurity(); }
  if (tab === 'documents') { loadDocuments(); initStatementMonthPicker(); }
  if (tab === 'defi') { loadDefiTab(); }
}

// ============================================================
// Dashboard
// ============================================================
async function loadClientTransactions() {
  const list = document.getElementById('clientTxList');
  if (!list) return;
  try {
    const data = await apiFetch('/api/transactions?limit=10');
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
  } catch(e) {
    list.innerHTML = '<p class="text-xs text-red-400 text-center py-4">Could not load transactions.</p>';
  }
}

async function loadDashboard() {
  try {
    const data = await apiFetch('/api/dashboard');
    document.getElementById('kpiTotal').textContent = data.total_settlements || 0;
    document.getElementById('kpiBlocked').textContent = data.blocked || 0;
    document.getElementById('kpiFlagged').textContent = data.flagged || 0;

    // KPI Liquidity: clients/operators show their own account balance,
    // admin shows platform nostro, management roles hide the KPI card entirely
    const kpiLiqCard  = document.getElementById('kpiLiquidityCard');
    const kpiLiqEl    = document.getElementById('kpiLiquidity');
    const kpiLiqLabel = document.getElementById('kpiLiquidityLabel');
    const mgmtRoles   = ['admin', 'compliance', 'auditor', 'datascientist'];
    if (ROLE === 'client' || ROLE === 'operator') {
      if (kpiLiqCard) kpiLiqCard.style.display = '';
      const subData = await apiFetch('/api/accounts/sub-accounts').catch(() => null);
      const accounts = subData ? (subData.accounts || []) : [];
      const totalBal = accounts.reduce((s, a) => s + (a.balance || 0), 0);
      if (kpiLiqEl) kpiLiqEl.textContent = '$' + Number(totalBal).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});
      if (kpiLiqLabel) kpiLiqLabel.textContent = 'ACCOUNT BALANCE';
    } else if (ROLE === 'admin') {
      if (kpiLiqCard) kpiLiqCard.style.display = 'none';
    } else {
      // compliance, auditor, datascientist — hide balance entirely
      if (kpiLiqCard) kpiLiqCard.style.display = 'none';
    }

    // Proof of Reserve: internal only — hide for clients
    const porSection = document.getElementById('proofOfReserve');
    if (porSection) porSection.style.display = ROLE === 'client' ? 'none' : '';

    // SLA Dashboard: only relevant for admin, compliance, auditor
    const slaSection = document.getElementById('slaDashboardSection');
    if (slaSection) {
      slaSection.style.display = ['admin', 'compliance', 'auditor'].includes(ROLE) ? '' : 'none';
    }

    ACCOUNTS = data.accounts || [];
    const subAccSection = document.getElementById('subAccountsSection');
    if (subAccSection) {
      subAccSection.style.display = ['client', 'operator'].includes(ROLE) ? '' : 'none';
    }
    if (['client', 'operator'].includes(ROLE)) loadSubAccounts();
    loadLedger();
    if (ROLE !== 'client') loadProofOfReserve();
    loadVolumeChart();
  } catch (e) { console.error('Dashboard error:', e); }
}

async function loadSubAccounts() {
  try {
    const data = await apiFetch('/api/accounts/sub-accounts');
    const container = document.getElementById('subAccountCards');
    const accounts = data.accounts || [];
    if (accounts.length === 0) {
      container.innerHTML = '<span class="text-gray-500">No sub-accounts found.</span>';
      return;
    }
    const icons = { checking: 'fa-money-check', savings: 'fa-piggy-bank', business: 'fa-briefcase', vault: 'fa-vault' };
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
  } catch (e) { console.error('Sub-accounts error:', e); }
}

async function loadLedger() {
  try {
    const data = await apiFetch('/api/ledger?page=1&per_page=10');
    const tbody = document.getElementById('dashLedgerBody');
    const entries = data.transactions || [];
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-600">No ledger entries yet. Execute a settlement to begin.</td></tr>';
      return;
    }
    const currentBal = data.balance_current || BALANCE;
    tbody.innerHTML = entries.map(e => {
      const isCredit = e.direction === 'credit';
      const amtColor = isCredit ? 'text-green-400' : 'text-red-400';
      const amtPrefix = isCredit ? '+' : '-';
      const statusColor = e.status === 'settled' ? 'text-accent' : e.status === 'blocked' ? 'text-red-400' : 'text-yellow-400';
      return `<tr class="border-b border-gray-200/30 hover:bg-gray-100/30">
        <td class="py-1.5 px-2 text-gray-500">${e.created_at || '-'}</td>
        <td class="py-1.5 px-2"><span class="px-1.5 py-0.5 rounded text-[10px] ${isCredit ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} uppercase">${e.direction}</span></td>
        <td class="py-1.5 px-2 text-gray-600">${e.counterparty || '-'} <span class="${statusColor} text-[10px] uppercase">[${e.status}]</span></td>
        <td class="py-1.5 px-2 text-right font-mono ${amtColor}">${amtPrefix}$${Number(e.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td class="py-1.5 px-2 text-right font-mono text-gray-800">$${Number(currentBal).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('Ledger error:', e); }
}

// ── AML Telemetry Transaction Explorer ────────────────────────
let _telemetryAll  = [];
let _telemetryFilt = [];
let _telemetryPage = 1;
const TELEMETRY_PAGE_SIZE = 15;

async function loadTransactions() {
  const tbody = document.getElementById('telemetryBody');
  if (!tbody) return;
  try {
    const data = await apiFetch('/api/transactions?per_page=500');
    _telemetryAll  = data.transactions || [];
    _telemetryPage = 1;
    filterTelemetry();
  } catch (e) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">Failed to load transactions.</td></tr>';
    console.error('Transactions error:', e);
  }
}

function refreshTelemetry() { loadTransactions(); }

function filterTelemetry() {
  const q       = (document.getElementById('telemetrySearch')?.value || '').toLowerCase();
  const status  = document.getElementById('telemetryStatusFilter')?.value || '';
  const risk    = document.getElementById('telemetryRiskFilter')?.value || '';

  _telemetryFilt = _telemetryAll.filter(tx => {
    const matchQ = !q || (tx.sender||'').toLowerCase().includes(q)
                      || (tx.beneficiary_name||'').toLowerCase().includes(q)
                      || (tx.id||'').toLowerCase().includes(q)
                      || (tx.tx_hash||'').toLowerCase().includes(q);
    const matchStatus = !status || (tx.status||'') === status;
    const score = tx.risk_score || 0;
    const matchRisk = !risk
      || (risk === 'critical' && score >= 85)
      || (risk === 'high'     && score >= 70 && score < 85)
      || (risk === 'medium'   && score >= 40 && score < 70)
      || (risk === 'low'      && score < 40);
    return matchQ && matchStatus && matchRisk;
  });

  _telemetryPage = 1;
  renderTelemetry();
}

function telemetryPage(dir) {
  const total = Math.ceil(_telemetryFilt.length / TELEMETRY_PAGE_SIZE) || 1;
  _telemetryPage = Math.max(1, Math.min(total, _telemetryPage + dir));
  renderTelemetry();
}

function renderTelemetry() {
  const tbody   = document.getElementById('telemetryBody');
  const countEl = document.getElementById('telemetryCount');
  const pageEl  = document.getElementById('telemetryPageInfo');
  const prevBtn = document.getElementById('telemetryPrev');
  const nextBtn = document.getElementById('telemetryNext');
  if (!tbody) return;

  const total = Math.ceil(_telemetryFilt.length / TELEMETRY_PAGE_SIZE) || 1;
  const start = (_telemetryPage - 1) * TELEMETRY_PAGE_SIZE;
  const page  = _telemetryFilt.slice(start, start + TELEMETRY_PAGE_SIZE);

  if (countEl) countEl.textContent = `${_telemetryFilt.length} transaction${_telemetryFilt.length !== 1 ? 's' : ''}`;
  if (pageEl)  pageEl.textContent  = `Page ${_telemetryPage} of ${total}`;
  if (prevBtn) prevBtn.disabled = _telemetryPage <= 1;
  if (nextBtn) nextBtn.disabled = _telemetryPage >= total;

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">No transactions match the current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = page.map(tx => {
    const score   = tx.risk_score || 0;
    const dotColor = score >= 85 ? 'bg-red-500' : score >= 70 ? 'bg-orange-400' : score >= 40 ? 'bg-yellow-400' : 'bg-green-500';
    const rowBg    = tx.status === 'blocked' ? 'bg-red-500/5' : tx.status === 'flagged' ? 'bg-yellow-500/5' : '';
    const shortId  = tx.id ? tx.id.substring(0, 8) + '…' : '—';
    const shortHash= tx.tx_hash ? tx.tx_hash.substring(0, 14) + '…' : '—';
    const safeId   = (tx.id || '').replace(/'/g, "\\'");
    const statusBadge = {
      settled:  'bg-green-100 text-green-700',
      approved: 'bg-blue-100 text-blue-700',
      blocked:  'bg-red-100 text-red-700',
      pending:  'bg-yellow-100 text-yellow-700',
      flagged:  'bg-orange-100 text-orange-700',
    }[tx.status] || 'bg-gray-100 text-gray-600';

    return `<tr onclick="showAmlTxDetail('${safeId}')" class="${rowBg} border-b border-gray-100 hover:bg-blue-50 transition cursor-pointer group">
      <td class="py-2 px-3 whitespace-nowrap text-gray-400">${(tx.created_at||'—').replace('T',' ').substring(0,16)}</td>
      <td class="py-2 px-3 font-mono text-gray-500" title="${tx.id||''}">${shortId}</td>
      <td class="py-2 px-3 group-hover:text-blue-700 font-medium">${tx.sender||'—'}</td>
      <td class="py-2 px-3 group-hover:text-blue-700">${tx.beneficiary_name||'—'}</td>
      <td class="py-2 px-3 text-right font-semibold">$${Number(tx.amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td class="py-2 px-3 text-center">
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full ${dotColor} inline-block flex-shrink-0"></span>
          <span class="font-mono font-semibold ${score>=85?'text-red-600':score>=70?'text-orange-500':score>=40?'text-yellow-600':'text-green-600'}">${score.toFixed(1)}</span>
        </span>
      </td>
      <td class="py-2 px-3 text-center">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${statusBadge}">${tx.status||'—'}</span>
      </td>
      <td class="py-2 px-3 font-mono text-gray-400" title="${tx.tx_hash||''}">${shortHash}</td>
    </tr>`;
  }).join('');
}

function initVolumeChart(labels = [], settled = [], blocked = []) {
  const ctx = document.getElementById('volumeChart');
  if (!ctx) return;
  if (volumeChart) volumeChart.destroy();
  volumeChart = new Chart(ctx, {
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
    // Clients and operators see only their own transaction volume
    const userFilter = ['client', 'operator'].includes(ROLE) ? `&username=${encodeURIComponent(USER)}` : '';
    const data = await apiFetch(`/api/analytics/volume-history?days=14${userFilter}`);
    initVolumeChart(data.labels || [], data.settled || [], data.blocked || []);
  } catch (e) {
    initVolumeChart();
  }
}

function pushChartData(status) {
  if (!volumeChart) { loadVolumeChart(); return; }
  const settled = volumeChart.data.datasets[0].data;
  const blocked = volumeChart.data.datasets[1].data;
  if (settled.length === 0) { loadVolumeChart(); return; }
  const idx = settled.length - 1;
  if (status === 'blocked' || status === 'BLOCKED') {
    blocked[idx] = (blocked[idx] || 0) + 1;
  } else {
    settled[idx] = (settled[idx] || 0) + 1;
  }
  volumeChart.update();
}

// ============================================================
// SSE
// ============================================================
function connectSSE() {
  if (sseSource) sseSource.close();
  sseSource = new EventSource(API + '/api/stream');
  sseSource.onmessage = function(e) {
    try {
      const event = JSON.parse(e.data);
      if (event.type === 'settlement') {
        loadDashboard();
        if (ROLE === 'client') loadClientTransactions();
        pushChartData(event.data.status);
      } else if (event.type === 'hitl') {
        loadHITL();
        if (event.data && event.data.action === 'approved' && window._pendingFlowHitlId && event.data.id === window._pendingFlowHitlId) {
          window._pendingFlowHitlId = null;
          showPaymentFlow('hitl_approved', { tx_hash: event.data.tx_hash });
        }
      } else if (event.type === 'retrain') {
        loadModelMetrics();
        if (document.getElementById('tab-mlops') && !document.getElementById('tab-mlops').classList.contains('hidden')) {
          const logEl = document.getElementById('mlops-log');
          if (logEl && event.data) {
            const ts = new Date().toLocaleTimeString();
            if (event.data.model) logEl.innerHTML += `<div class="text-yellow-300">[${ts}] ${event.data.message || ('Training: ' + event.data.model)}</div>`;
            if (event.data.status === 'complete') { logEl.innerHTML += `<div class="text-green-300">[${ts}] ✓ Complete!</div>`; loadMLOps(); }
            if (event.data.status === 'error') logEl.innerHTML += `<div class="text-red-400">[${ts}] Error: ${event.data.message}</div>`;
            logEl.scrollTop = logEl.scrollHeight;
          }
        }
      } else if (event.type === 'notification') {
        loadNotifications();
      }
    } catch (err) {}
  };
  sseSource.onerror = function() {
    setTimeout(connectSSE, 5000);
  };
}

// ============================================================
// FX Rates
// ============================================================
async function loadFXRates() {
  try {
    const data = await apiFetch('/api/fx/rates');
    FX_RATES = data.rates || {};
    const ticker = document.getElementById('fxTicker');
    if (ticker && Object.keys(FX_RATES).length > 0) {
      ticker.innerHTML = Object.entries(FX_RATES).map(([ccy, rate]) => {
        return `<span class="px-2 py-1 rounded bg-gray-100 text-gray-600"><span class="text-accent font-mono">${ccy}</span> ${rate.toFixed(4)}</span>`;
      }).join('');
    }
    populateCurrencyDropdowns();
  } catch (e) { console.error('FX rates error:', e); }
}

function populateCurrencyDropdowns() {
  const currencies = ['USD', ...Object.keys(FX_RATES)];
  const selectors = ['payCurrency', 'fxConvertFrom', 'fxConvertTo'];
  selectors.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = currencies.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
    if (id === 'fxConvertTo' && !currentVal) sel.value = 'EUR';
  });
}

function updateFXPreview() {
  const currency = document.getElementById('payCurrency').value;
  const amount = parseFloat(document.getElementById('payAmount').value) || 0;
  const fxPreview = document.getElementById('fxPreview');
  let usdAmount = amount;
  if (currency && currency !== 'USD' && FX_RATES[currency]) {
    const rate = FX_RATES[currency];
    usdAmount = amount / rate;
    document.getElementById('fxPreviewRate').textContent = `1 USD = ${rate.toFixed(4)} ${currency}`;
    document.getElementById('fxPreviewUSD').textContent = `$${usdAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    fxPreview.classList.remove('hidden');
  } else {
    fxPreview.classList.add('hidden');
  }
  const trFields = document.getElementById('travelRuleFields');
  if (trFields) {
    if (usdAmount >= 3000) trFields.classList.remove('hidden');
    else trFields.classList.add('hidden');
  }
  const feeDiv = document.getElementById('feePreview');
  if (feeDiv && usdAmount > 0) {
    const pyType = currency !== 'USD' ? 'fx' : 'standard';
    const tiers = [[0,1000,0.0025,0.50],[1000,10000,0.0020,2.00],[10000,100000,0.0015,15.00],[100000,500000,0.0010,100.00],[500000,null,0.0005,500.00]];
    let rate = 0.0025, minFee = 0.50;
    for (const [lo, hi, r, mf] of tiers) { if (hi === null || usdAmount < hi) { rate = r; minFee = mf; break; } }
    const baseFee = Math.max(usdAmount * rate, minFee);
    const fxFee   = pyType === 'fx' ? usdAmount * 0.001 : 0;
    const total   = baseFee + fxFee;
    document.getElementById('feePreviewRate').textContent    = `${(rate*100).toFixed(3)}%`;
    document.getElementById('feePreviewAmount').textContent  = `$${total.toFixed(2)}`;
    document.getElementById('feePreviewTotal').textContent   = `$${(usdAmount + total).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    feeDiv.classList.remove('hidden');
  } else if (feeDiv) {
    feeDiv.classList.add('hidden');
  }
  showAMLWarning(usdAmount);
}

function showAMLWarning(usdAmount) {
  const amlWarning = document.getElementById('amlWarning');
  const amlText = document.getElementById('amlWarningText');
  if (usdAmount >= 500000) {
    amlText.textContent = `Amount exceeds $500K — transaction will be AUTO-BLOCKED for enhanced due diligence and compliance review.`;
    amlWarning.classList.remove('hidden');
  } else if (usdAmount >= 100000) {
    amlText.textContent = `High Volume Transaction Alert — transaction will be flagged for AML review and routed to Human-in-the-Loop queue.`;
    amlWarning.classList.remove('hidden');
  } else {
    amlWarning.classList.add('hidden');
  }
}

async function convertFX() {
  const amount = parseFloat(document.getElementById('fxConvertAmount').value) || 0;
  const from = document.getElementById('fxConvertFrom').value;
  const to = document.getElementById('fxConvertTo').value;
  const resultDiv = document.getElementById('fxConvertResult');
  try {
    const data = await apiFetch(`/api/fx/convert?from=${from}&to=${to}&amount=${amount}`);
    resultDiv.innerHTML = `
      <div class="bg-gray-100 rounded-lg p-3 fade-in">
        <div class="flex justify-between items-center">
          <span class="text-gray-500">${amount.toLocaleString()} ${from}</span>
          <i class="fas fa-arrow-right text-accent"></i>
          <span class="text-gray-800 font-bold text-lg">${data.converted_amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${to}</span>
        </div>
        <p class="text-xs text-gray-600 mt-1">Rate: ${data.rate.toFixed(6)} | Spread: ${((data.spread || 0) * 100).toFixed(2)}%</p>
      </div>`;
  } catch (e) {
    resultDiv.innerHTML = `<p class="text-red-400 text-xs">Conversion error: ${e.message}</p>`;
  }
}

// ============================================================
// Health Polling
// ============================================================
async function pollHealth() {
  try {
    const data = await apiFetch('/api/health');
    const dot = document.getElementById('healthDot');
    const label = document.getElementById('healthLabel');
    if (data.status === 'healthy') {
      dot.className = 'pulse-dot inline-block w-2 h-2 rounded-full bg-accent';
      dot.title = 'All systems healthy';
      label.textContent = 'LIVE';
      label.className = 'text-xs text-accent';
    } else if (data.status === 'degraded') {
      dot.className = 'pulse-dot inline-block w-2 h-2 rounded-full bg-yellow-400';
      dot.title = 'System degraded';
      label.textContent = 'DEGRADED';
      label.className = 'text-xs text-yellow-400';
    } else {
      dot.className = 'inline-block w-2 h-2 rounded-full bg-red-500';
      dot.title = 'System unhealthy';
      label.textContent = 'DOWN';
      label.className = 'text-xs text-red-400';
    }
  } catch (e) {
    const dot = document.getElementById('healthDot');
    const label = document.getElementById('healthLabel');
    dot.className = 'inline-block w-2 h-2 rounded-full bg-red-500';
    label.textContent = 'OFFLINE';
    label.className = 'text-xs text-red-400';
  }
}

// ============================================================
// SHAP Explainability
// ============================================================
function renderSHAPChart(shapValues) {
  const container = document.getElementById('shapContainer');
  const canvas = document.getElementById('shapChart');
  if (!shapValues || Object.keys(shapValues).length === 0) return;
  container.classList.add('hidden');
  canvas.classList.remove('hidden');
  if (shapChart) shapChart.destroy();
  const sorted = Object.entries(shapValues).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10);
  shapChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(e => e[0]),
      datasets: [{
        label: 'SHAP Contribution',
        data: sorted.map(e => e[1].toFixed(3)),
        backgroundColor: sorted.map(e => e[1] > 0 ? 'rgba(239,68,68,0.7)' : 'rgba(16,185,129,0.7)'),
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.x > 0 ? '+' : ''}${ctx.parsed.x} (${ctx.parsed.x > 0 ? 'increases' : 'decreases'} risk)`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#556677' },
          grid: { color: '#1e2d3d' },
          title: { display: true, text: 'Impact on Risk Score', color: '#8899aa', font: { size: 10 } }
        },
        y: { ticks: { color: '#8899aa', font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

// ============================================================
// Proof of Reserve
// ============================================================
async function loadProofOfReserve() {
  try {
    const data = await apiFetch('/api/defi/proof-of-reserve');
    document.getElementById('porOffchain').textContent = '$' + Number(data.offchain_total).toLocaleString();
    document.getElementById('porOnchain').textContent = '$' + Number(data.onchain_total).toLocaleString();
    document.getElementById('porRatio').textContent = data.ratio.toFixed(4);
    document.getElementById('porRatio').className = data.backed ? 'font-semibold text-green-400' : 'font-semibold text-red-400';
    const badge = document.getElementById('porBadge');
    if (data.backed) {
      badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400';
      badge.innerHTML = '<i class="fas fa-check-circle mr-1"></i>1:1 Backed';
    } else {
      badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400';
      badge.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>Under-collateralized';
    }
  } catch(e) { console.error('PoR error', e); }
}

// ============================================================
// SLA Tracking
// ============================================================
function getSLABadge(caseItem) {
  if (caseItem.status === 'resolved' || caseItem.status === 'closed') {
    return '<span class="text-xs text-green-400"><i class="fas fa-check mr-1"></i>Met</span>';
  }
  if (!caseItem.created_at) return '<span class="text-xs text-gray-600">N/A</span>';
  const created = new Date(caseItem.created_at);
  const now = new Date();
  const hoursElapsed = (now - created) / (1000 * 60 * 60);
  const slaHours = { critical: 4, high: 24, medium: 72, low: 168 };
  const maxHours = slaHours[caseItem.severity] || 72;
  const remaining = maxHours - hoursElapsed;
  if (remaining <= 0) {
    return `<span class="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-mono"><i class="fas fa-clock mr-1"></i>BREACHED</span>`;
  } else if (remaining <= maxHours * 0.25) {
    const hrs = Math.floor(remaining);
    const mins = Math.floor((remaining - hrs) * 60);
    return `<span class="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs font-mono"><i class="fas fa-clock mr-1"></i>${hrs}h ${mins}m</span>`;
  } else {
    const hrs = Math.floor(remaining);
    return `<span class="px-1.5 py-0.5 rounded bg-gray-200 text-gray-400 text-xs font-mono"><i class="fas fa-clock mr-1"></i>${hrs}h</span>`;
  }
}

// ============================================================
// Notifications
// ============================================================
const NOTIF_ICONS = {
  success: { icon: 'fa-check-circle', color: 'text-green-500' },
  error:   { icon: 'fa-times-circle', color: 'text-red-500' },
  warning: { icon: 'fa-exclamation-triangle', color: 'text-amber-500' },
  info:    { icon: 'fa-info-circle', color: 'text-blue-500' },
};

async function loadNotifications() {
  try {
    const d = await apiFetch('/api/notifications');
    const badge = document.getElementById('notifBadge');
    const list  = document.getElementById('notifList');
    if (!badge || !list) return;
    if (d.unread_count > 0) {
      badge.textContent = d.unread_count > 99 ? '99+' : d.unread_count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    if (!d.notifications.length) {
      list.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">No notifications</p>';
      return;
    }
    list.innerHTML = d.notifications.map(n => {
      const ic = NOTIF_ICONS[n.type] || NOTIF_ICONS.info;
      const time = n.created_at ? new Date(n.created_at).toLocaleString() : '';
      const unreadClass = n.read ? '' : 'bg-blue-50';
      return `<div class="px-4 py-3 hover:bg-gray-50 cursor-pointer ${unreadClass} transition"
                   onclick="notifClick('${n.id}', '${n.link_tab || ''}')">
        <div class="flex gap-3 items-start">
          <i class="fas ${ic.icon} ${ic.color} mt-0.5 flex-shrink-0"></i>
          <div class="flex-1 min-w-0">
            <p class="text-xs ${n.read ? 'font-normal' : 'font-bold'} text-gray-800">${n.title}</p>
            <p class="text-xs text-gray-500 mt-0.5 leading-snug">${n.message}</p>
            <p class="text-[10px] text-gray-300 mt-1">${time}</p>
          </div>
          ${!n.read ? '<span class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></span>' : ''}
        </div>
      </div>`;
    }).join('');
  } catch (e) { console.error('Notif load error', e); }
}

async function notifClick(id, linkTab) {
  await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
  toggleNotifPanel();
  if (linkTab) switchTab(linkTab);
  loadNotifications();
}

async function markAllRead() {
  await apiFetch('/api/notifications/read-all', { method: 'POST' });
  loadNotifications();
}

async function clearReadNotifs() {
  await apiFetch('/api/notifications/clear', { method: 'DELETE' });
  loadNotifications();
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) loadNotifications();
}

function toggleNotifications() { toggleNotifPanel(); }

document.addEventListener('click', function(e) {
  const wrapper = document.getElementById('notifBellWrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    document.getElementById('notifPanel')?.classList.add('hidden');
  }
});

// ============================================================
// Support Chat
// ============================================================
let chatSessionId = Math.random().toString(36).substring(2, 10);

function toggleChat() { document.getElementById('chatPanel').classList.toggle('hidden'); }

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  const div = document.getElementById('chatMessages');
  div.innerHTML += `<div class="bg-gray-200 rounded-lg p-2 text-xs text-gray-800 max-w-[85%] ml-auto">${msg}</div>`;
  const typingId = 'typing-' + Date.now();
  div.innerHTML += `<div id="${typingId}" class="bg-blue-50 rounded-lg p-2 text-xs text-gray-400 max-w-[85%] animate-pulse"><span class="text-accent font-semibold">Bot:</span> Thinking...</div>`;
  div.scrollTop = div.scrollHeight;
  try {
    const result = await apiFetch('/api/support/message', { method: 'POST', body: JSON.stringify({ message: msg, session_id: chatSessionId }) });
    const typing = document.getElementById(typingId);
    if (typing) typing.remove();
    div.innerHTML += `<div class="bg-blue-50 rounded-lg p-2 text-xs text-gray-600 max-w-[85%]"><span class="text-accent font-semibold">Bot:</span> ${result.response}</div>`;
    div.scrollTop = div.scrollHeight;
  } catch (e) {
    const typing = document.getElementById(typingId);
    if (typing) typing.remove();
    div.innerHTML += `<div class="bg-red-500/10 rounded-lg p-2 text-xs text-red-400 max-w-[85%]"><span class="font-semibold">Error:</span> Could not reach support. Please try again.</div>`;
    div.scrollTop = div.scrollHeight;
  }
}

// ============================================================
// Session Timeout
// ============================================================
// _sessionTimer and _sessionWarnTimer declared in index.html global block
const SESSION_HOURS = 8;
const WARN_BEFORE_MINS = 5;

function startSessionTimer() {
  clearTimeout(_sessionTimer);
  clearTimeout(_sessionWarnTimer);
  const warnMs = (SESSION_HOURS * 3600 - WARN_BEFORE_MINS * 60) * 1000;
  const expireMs = SESSION_HOURS * 3600 * 1000;
  _sessionWarnTimer = setTimeout(() => {
    const banner = document.getElementById('sessionWarnBanner');
    if (banner) { banner.classList.remove('hidden'); }
  }, warnMs);
  _sessionTimer = setTimeout(() => {
    alert('Your session has expired. You will be logged out.');
    doLogout();
  }, expireMs);
}

async function extendSession() {
  try {
    const refresh = localStorage.getItem('ipts_refresh_token');
    if (!refresh) { doLogout(); return; }
    const d = await fetch('/api/auth/refresh', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({refresh_token: refresh}) });
    const json = await d.json();
    if (json.token) {
      TOKEN = json.token;
      localStorage.setItem('ipts_token', TOKEN);
      document.getElementById('sessionWarnBanner')?.classList.add('hidden');
      startSessionTimer();
    } else { doLogout(); }
  } catch(e) { doLogout(); }
}

// ============================================================
// Transaction Limits Display
// ============================================================
function showTxLimits(txLimits) {
  if (!txLimits || (!txLimits.per_tx && !txLimits.daily)) return;
  const bar = document.getElementById('txLimitsBar');
  if (!bar) return;
  document.getElementById('perTxLimit').textContent =
    txLimits.per_tx ? `$${Number(txLimits.per_tx).toLocaleString()}` : 'Unlimited';
  document.getElementById('dailyLimit').textContent =
    txLimits.daily ? `$${Number(txLimits.daily).toLocaleString()} / day` : 'Unlimited';
  bar.classList.remove('hidden');
}

// ============================================================
// Admin: Settlement Refund
// ============================================================
async function refundSettlement(settlementId) {
  const reason = prompt('Reason for reversal (required):');
  if (reason === null) return;
  if (!reason.trim()) { alert('A reason is required for settlement reversal.'); return; }
  try {
    const d = await apiFetch(`/api/settlement/${settlementId}/refund`, { method: 'POST', body: JSON.stringify({ reason }) });
    alert(`✔ ${d.message}`);
    loadDashboard();
  } catch(e) { alert('Reversal failed: ' + e.message); }
}

// ============================================================
// Account Statement Download
// ============================================================
function initStatementMonthPicker() {
  const sel = document.getElementById('statementMonth');
  if (!sel) return;
  sel.innerHTML = '';
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    sel.innerHTML += `<option value="${val}">${label}</option>`;
  }
}

async function downloadStatement() {
  const month = document.getElementById('statementMonth')?.value;
  if (!month) return;
  const url = `/api/accounts/statement?month=${month}&format=pdf&token=${TOKEN}`;
  const a = document.createElement('a');
  a.href = url; a.download = `IPTS_Statement_${month}.pdf`;
  a.click();
}

// ============================================================
// Init
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  initVolumeChart();
  initStatementMonthPicker();
  if (TOKEN) {
    fetchAccountInfo().then(() => showApp());
  }
  setInterval(() => { if (TOKEN) loadNotifications(); }, 30000);
});

document.addEventListener('DOMContentLoaded', () => {
  const pass = document.getElementById('loginPass');
  if (pass) pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
});

// ============================================================
// Maintenance Banner + Announcement Banner (core polling)
// ============================================================
async function pollMaintenanceBanner() {
  try {
    const d = await fetch((typeof API !== 'undefined' ? API : '') + '/api/admin/maintenance').then(r => r.json());
    const banner = document.getElementById('maintenanceBanner');
    if (banner) {
      if (d.enabled && (typeof ROLE === 'undefined' || ROLE !== 'admin')) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
    // Update admin toggle if on admin tab
    if (typeof loadMaintenanceState === 'function') loadMaintenanceState();
  } catch(e) {}
}

let _lastAnnouncementMsg = '';
async function pollAnnouncementBanner() {
  try {
    const d = await fetch((typeof API !== 'undefined' ? API : '') + '/api/admin/announcement').then(r => r.json());
    const banner = document.getElementById('announcementBanner');
    const textEl = document.getElementById('announcementBannerText');
    if (!banner || !textEl) return;
    if (d.active && d.message) {
      // Check sessionStorage dismissal
      const dismissed = sessionStorage.getItem('ipts_announcement_dismissed');
      if (dismissed === d.message && d.message === _lastAnnouncementMsg) {
        banner.classList.add('hidden');
        return;
      }
      if (dismissed !== d.message) {
        sessionStorage.removeItem('ipts_announcement_dismissed');
      }
      textEl.textContent = d.message;
      banner.classList.remove('hidden');
      _lastAnnouncementMsg = d.message;
    } else {
      banner.classList.add('hidden');
    }
  } catch(e) {}
}

function dismissAnnouncement() {
  const textEl = document.getElementById('announcementBannerText');
  if (textEl) sessionStorage.setItem('ipts_announcement_dismissed', textEl.textContent);
  const banner = document.getElementById('announcementBanner');
  if (banner) banner.classList.add('hidden');
}
