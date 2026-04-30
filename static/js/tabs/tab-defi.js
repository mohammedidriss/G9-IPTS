// ============================================================
// DeFi Tab Entry
// ============================================================
function loadDefiTab() {
  const isClient = ROLE === 'client';

  const title    = document.getElementById('defiTabTitle');
  const subtitle = document.getElementById('defiTabSubtitle');
  if (isClient) {
    if (title)    title.innerHTML    = '<i class="fas fa-cubes mr-2 text-accent"></i>DeFi';
    if (subtitle) subtitle.textContent = 'Swap currencies, stake funds for yield, and create escrow contracts.';
  } else {
    if (title)    title.innerHTML    = '<i class="fas fa-shield-halved mr-2 text-accent"></i>DeFi Admin';
    if (subtitle) subtitle.textContent = 'Protocol governance, pool management, emergency controls & treasury';
  }

  const adminPanel   = document.getElementById('defiAdminPanel');
  const clientTabs   = document.getElementById('defiClientTabs');
  if (adminPanel) adminPanel.classList.toggle('hidden', isClient);
  if (clientTabs) clientTabs.classList.toggle('hidden', !isClient);

  if (isClient) {
    showDefiClientSection('swap');
    loadPools();
    loadDefiPortfolio();
  } else {
    loadDefiAdmin();
  }
}

function showDefiClientSection(section) {
  document.querySelectorAll('.defi-client-tab').forEach(btn => {
    const active = btn.getAttribute('data-client-section') === section;
    btn.classList.toggle('bg-accent', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('bg-gray-100', !active);
    btn.classList.toggle('text-gray-600', !active);
  });
  document.querySelectorAll('.defi-sub').forEach(el => el.classList.add('hidden'));
  const map = { swap: 'defiSwap', stake: 'defiStake', escrow: 'defiEscrow' };
  const el = document.getElementById(map[section]);
  if (el) el.classList.remove('hidden');
  if (section === 'swap')   loadPools();
  if (section === 'stake')  loadStaking();
  if (section === 'escrow') loadEscrows();
}

// ============================================================
// DeFi Admin — Protocol Governance & Management
// ============================================================
let _defiAdminData = null;

function showDefiAdminSection(section) {
  document.querySelectorAll('.defi-admin-section').forEach(el => el.classList.add('hidden'));
  const map = { pools:'defiAdminPools', params:'defiAdminParams', fees:'defiAdminFeesMgmt', emergency:'defiAdminEmergency', governance:'defiAdminGovernance' };
  const el = document.getElementById(map[section]);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('.defi-admin-tab').forEach(btn => {
    if (btn.dataset.section === section) {
      btn.className = 'defi-admin-tab px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white transition';
    } else {
      btn.className = 'defi-admin-tab px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition';
    }
  });
}

async function loadDefiAdmin() {
  try {
    const d = await apiFetch('/api/defi/admin/overview');
    _defiAdminData = d;
    document.getElementById('defiAdminTVL').textContent = '$' + Number(d.total_tvl).toLocaleString('en-US', {minimumFractionDigits:2});
    document.getElementById('defiAdminVol').textContent = '$' + Number(d.total_volume).toLocaleString('en-US', {minimumFractionDigits:2});
    document.getElementById('defiAdminFees').textContent = '$' + Number(d.accrued_fees).toLocaleString('en-US', {minimumFractionDigits:2});
    document.getElementById('defiAdminStakes').textContent = d.staking.positions + ' ($' + Number(d.staking.total_staked).toLocaleString('en-US', {minimumFractionDigits:0}) + ')';
    renderDefiAdminPools(d.pools);
    renderDefiAdminParams(d.params);
    renderFeeSwitch(d.params);
    renderEmergencyControls(d.emergency);
  } catch(e) { console.error('DeFi Admin load error:', e); }
  loadProposals();
}

function renderDefiAdminPools(pools) {
  const el = document.getElementById('defiAdminPoolTable');
  if (!pools || !pools.length) { el.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No pools found.</p>'; return; }
  el.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead><tr class="text-gray-400 border-b border-gray-100">
          <th class="text-left py-2 font-medium">Pair</th>
          <th class="text-right py-2 font-medium">Reserve Base</th>
          <th class="text-right py-2 font-medium">Reserve Quote</th>
          <th class="text-right py-2 font-medium">TVL</th>
          <th class="text-right py-2 font-medium">Volume</th>
          <th class="text-right py-2 font-medium">Swaps</th>
          <th class="text-center py-2 font-medium">Liquidity</th>
        </tr></thead>
        <tbody>
          ${pools.map(p => `
            <tr class="border-b border-gray-50 hover:bg-gray-50/50">
              <td class="py-2 font-mono font-semibold text-accent">${p.pair}</td>
              <td class="py-2 text-right text-gray-600">${Number(p.reserve_base).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td class="py-2 text-right text-gray-600">${Number(p.reserve_quote).toLocaleString('en-US', {minimumFractionDigits:4})}</td>
              <td class="py-2 text-right font-semibold text-gray-800">$${Number(p.tvl).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td class="py-2 text-right text-gray-600">$${Number(p.volume).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td class="py-2 text-right text-gray-600">${p.swaps}</td>
              <td class="py-2 text-center">
                <button onclick="showLiquidityModal('${p.pair}')" class="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs hover:bg-blue-100 transition">
                  <i class="fas fa-plus-minus mr-1"></i>Adjust
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function showLiquidityModal(pair) {
  const r = prompt(`Adjust liquidity for ${pair}\nFormat: action,base_amount,quote_amount\nExample: add,50000,45000\nor: remove,10000,9000`);
  if (!r) return;
  const parts = r.split(',');
  if (parts.length !== 3) { alert('Invalid format'); return; }
  const [action, ab, aq] = parts;
  apiFetch(`/api/defi/admin/pool/${encodeURIComponent(pair)}/liquidity`, {
    method: 'POST',
    body: JSON.stringify({ action: action.trim(), amount_base: parseFloat(ab), amount_quote: parseFloat(aq) })
  }).then(d => { alert(`✓ ${d.status} — New TVL: $${Number(d.new_tvl).toLocaleString('en-US',{minimumFractionDigits:2})}`); loadDefiAdmin(); })
    .catch(e => alert('Error: ' + (e.message || e)));
}

const _paramMeta = {
  collateral_ratio:       { label: 'Collateral Ratio (%)', hint: 'Min collateral as % of debt. Default: 150%' },
  debt_ceiling_usd:       { label: 'Debt Ceiling (USD)', hint: 'Max total borrowing protocol-wide' },
  reserve_factor_pct:     { label: 'Reserve Factor (%)', hint: '% of interest directed to treasury. Default: 10%' },
  liquidation_threshold:  { label: 'Liquidation Threshold (%)', hint: 'Position liquidated below this collateral %. Default: 130%' },
  ltv_max_pct:            { label: 'Max LTV (%)', hint: 'Max loan-to-value per collateral unit. Default: 75%' },
  stability_fee_pct:      { label: 'Stability Fee (% APY)', hint: 'Annual borrowing cost. Default: 2.5%' },
  min_collateral_usd:     { label: 'Min Collateral (USD)', hint: 'Minimum collateral required to open position' },
};

function renderDefiAdminParams(params) {
  const el = document.getElementById('defiParamForm');
  if (!el) return;
  el.innerHTML = Object.entries(_paramMeta).map(([key, meta]) => `
    <div class="bg-gray-50 rounded-lg p-3">
      <label class="text-xs font-medium text-gray-700">${meta.label}</label>
      <p class="text-xs text-gray-400 mb-1">${meta.hint}</p>
      <input id="param_${key}" type="number" step="0.01" value="${params[key] || ''}"
        class="w-full px-3 py-2 rounded-lg text-sm mt-1">
    </div>
  `).join('');
  const pp = document.getElementById('feeProtocolPct');
  const pf = document.getElementById('feeFlashLoanBps');
  if (pp) pp.value = params.protocol_fee_pct || '0.05';
  if (pf) pf.value = params.flash_loan_fee_bps || '9';
}

async function saveDefiParams() {
  const updates = {};
  Object.keys(_paramMeta).forEach(key => {
    const el = document.getElementById('param_' + key);
    if (el && el.value !== '') updates[key] = el.value;
  });
  try {
    await apiFetch('/api/defi/admin/params', { method: 'POST', body: JSON.stringify({ updates }) });
    const msg = document.getElementById('defiParamMsg');
    msg.textContent = '✓ Saved at ' + new Date().toLocaleTimeString();
    msg.className = 'text-xs text-green-600';
    setTimeout(() => { msg.textContent = ''; }, 4000);
    loadDefiAdmin();
  } catch(e) { const msg = document.getElementById('defiParamMsg'); msg.textContent = 'Error: ' + e.message; msg.className = 'text-xs text-red-500'; }
}

function renderFeeSwitch(params) {
  const enabled = params.fee_switch_enabled === 'true';
  const btn = document.getElementById('feeSwitchBtn');
  const status = document.getElementById('feeSwitchStatus');
  if (!btn || !status) return;
  if (enabled) {
    btn.textContent = 'Disable Fee Collection';
    btn.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition';
    status.textContent = `Enabled — ${params.protocol_fee_pct || '0.05'}% of swap fees → treasury`;
    status.className = 'text-xs text-green-600 mt-0.5';
  } else {
    btn.textContent = 'Enable Fee Collection';
    btn.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-600 hover:bg-green-200 transition';
    status.textContent = 'Disabled — no protocol fees collected';
    status.className = 'text-xs text-gray-400 mt-0.5';
  }
}

async function toggleFeeSwitch() {
  const current = _defiAdminData?.params?.fee_switch_enabled === 'true';
  const newVal = (!current).toString();
  try {
    await apiFetch('/api/defi/admin/params', { method: 'POST', body: JSON.stringify({ updates: { fee_switch_enabled: newVal } }) });
    loadDefiAdmin();
  } catch(e) { alert('Error: ' + e.message); }
}

async function saveFeeConfig() {
  const pct = document.getElementById('feeProtocolPct').value;
  const bps = document.getElementById('feeFlashLoanBps').value;
  const msg = document.getElementById('feeConfigMsg');
  try {
    await apiFetch('/api/defi/admin/params', { method: 'POST', body: JSON.stringify({ updates: { protocol_fee_pct: pct, flash_loan_fee_bps: bps } }) });
    msg.textContent = '✓ Saved'; msg.className = 'text-xs text-green-600 rounded px-2 py-1'; msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
    loadDefiAdmin();
  } catch(e) { msg.textContent = 'Error: ' + e.message; msg.className = 'text-xs text-red-500 rounded px-2 py-1'; msg.classList.remove('hidden'); }
}

async function updatePoolFee() {
  const pair = document.getElementById('poolFeeSelect').value;
  const bps  = parseInt(document.getElementById('poolFeeBps').value);
  const msg  = document.getElementById('poolFeeMsg');
  if (!bps || bps < 1) { msg.textContent = 'Enter valid basis points'; msg.className='text-xs text-red-500 rounded px-2 py-1'; msg.classList.remove('hidden'); return; }
  try {
    const d = await apiFetch(`/api/defi/admin/pool/${encodeURIComponent(pair)}/fee`, { method: 'POST', body: JSON.stringify({ fee_bps: bps }) });
    msg.textContent = `✓ ${pair} fee set to ${d.fee_pct}% (${bps} bps)`;
    msg.className = 'text-xs text-green-600 rounded px-2 py-1'; msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 4000);
  } catch(e) { msg.textContent = 'Error: ' + e.message; msg.className='text-xs text-red-500 rounded px-2 py-1'; msg.classList.remove('hidden'); }
}

const _controlMeta = {
  deposits:    { label: 'Deposits',     icon: 'fa-arrow-down-to-line', color: 'blue',   desc: 'Halt new capital inflow to all pools' },
  withdrawals: { label: 'Withdrawals',  icon: 'fa-arrow-up-from-line', color: 'orange', desc: 'Prevent capital outflow from protocol' },
  borrowing:   { label: 'Borrowing',    icon: 'fa-hand-holding-dollar', color: 'yellow', desc: 'Stop new loan origination' },
  swaps:       { label: 'Swaps',        icon: 'fa-exchange-alt',       color: 'purple', desc: 'Pause all DEX swap operations' },
  liquidations:{ label: 'Liquidations', icon: 'fa-gavel',              color: 'red',    desc: 'Halt liquidation engine (flash crash protection)' },
};

function renderEmergencyControls(emergency) {
  const el = document.getElementById('emergencyControlGrid');
  if (!el) return;
  el.innerHTML = Object.entries(_controlMeta).map(([ctrl, meta]) => {
    const state = emergency?.[ctrl] || {};
    const paused = state.paused;
    return `
      <div class="glass rounded-xl p-4 border ${paused ? 'border-red-300 bg-red-50/40' : 'border-white/5'}">
        <div class="flex items-center gap-2 mb-2">
          <i class="fas ${meta.icon} text-${meta.color}-500"></i>
          <span class="text-sm font-semibold text-gray-800">${meta.label}</span>
          <span class="ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${paused ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">
            ${paused ? 'PAUSED' : 'ACTIVE'}
          </span>
        </div>
        <p class="text-xs text-gray-500 mb-3">${meta.desc}</p>
        ${paused ? `<p class="text-xs text-red-500 mb-2">By: ${state.by || '—'} · ${state.reason || ''}</p>` : ''}
        <button onclick="toggleEmergencyControl('${ctrl}', ${!paused})"
          class="w-full py-1.5 rounded-lg text-xs font-semibold transition ${paused
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-red-100 text-red-700 hover:bg-red-200'}">
          <i class="fas ${paused ? 'fa-play' : 'fa-pause'} mr-1"></i>${paused ? 'Resume' : 'Pause'} ${meta.label}
        </button>
      </div>
    `;
  }).join('');
}

async function toggleEmergencyControl(control, pause) {
  const reason = pause ? (prompt(`Reason for pausing ${control}:`) || 'Admin action') : 'Admin resumed';
  if (pause && !reason) return;
  try {
    await apiFetch(`/api/defi/admin/emergency/${control}`, { method: 'POST', body: JSON.stringify({ pause, reason }) });
    loadDefiAdmin();
    showDefiAdminSection('emergency');
  } catch(e) { alert('Error: ' + e.message); }
}

async function triggerGlobalPause(pause) {
  const reason = document.getElementById('emergencyReason').value.trim() || (pause ? 'Global circuit breaker activated' : 'Admin resumed all operations');
  try {
    await apiFetch('/api/defi/admin/emergency/global', { method: 'POST', body: JSON.stringify({ pause, reason }) });
    loadDefiAdmin();
    showDefiAdminSection('emergency');
  } catch(e) { alert('Error: ' + e.message); }
}

async function loadProposals() {
  try {
    const d = await apiFetch('/api/defi/governance/proposals');
    renderProposals(d.proposals);
  } catch(e) { console.error('proposals error:', e); }
}

const _propCategoryColors = { fee:'blue', param:'purple', pool:'cyan', emergency:'red', governance:'orange', general:'gray' };

function renderProposals(proposals) {
  const el = document.getElementById('proposalsList');
  if (!el) return;
  if (!proposals || !proposals.length) { el.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No proposals yet.</p>'; return; }
  el.innerHTML = proposals.map(p => {
    const col = _propCategoryColors[p.category] || 'gray';
    const votePct = p.votes_for + p.votes_against > 0 ? Math.round(p.votes_for / (p.votes_for + p.votes_against) * 100) : 0;
    const quorumMet = p.votes_for >= p.quorum;
    return `
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <span class="inline-block px-2 py-0.5 rounded text-xs bg-${col}-100 text-${col}-700 font-semibold mb-1">${p.category.toUpperCase()}</span>
            <p class="text-sm font-semibold text-gray-800">${p.title}</p>
            ${p.description ? `<p class="text-xs text-gray-500 mt-0.5">${p.description}</p>` : ''}
          </div>
          <span class="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${p.status==='active'?'bg-blue-100 text-blue-700':p.status==='executed'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}">
            ${p.status.toUpperCase()}
          </span>
        </div>
        <div class="flex items-center gap-3 mb-3">
          <div class="flex-1 bg-gray-200 rounded-full h-1.5">
            <div class="h-1.5 rounded-full bg-accent transition-all" style="width:${votePct}%"></div>
          </div>
          <span class="text-xs text-gray-500">${p.votes_for}✓ / ${p.votes_against}✗ (quorum: ${p.quorum})</span>
        </div>
        ${p.status === 'active' ? `
          <div class="flex gap-2">
            <button onclick="voteProposal('${p.id}','for')" class="flex-1 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition"><i class="fas fa-check mr-1"></i>Vote For</button>
            <button onclick="voteProposal('${p.id}','against')" class="flex-1 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition"><i class="fas fa-times mr-1"></i>Vote Against</button>
            ${quorumMet ? `<button onclick="executeProposal('${p.id}')" class="flex-1 py-1 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition"><i class="fas fa-bolt mr-1"></i>Execute</button>` : ''}
          </div>` : p.execution_result ? `<p class="text-xs text-green-600 mt-1"><i class="fas fa-check-circle mr-1"></i>${p.execution_result}</p>` : ''}
        <p class="text-xs text-gray-400 mt-2">By ${p.created_by} · ${p.created_at?.slice(0,16) || ''}</p>
      </div>
    `;
  }).join('');
}

async function submitProposal() {
  const title = document.getElementById('propTitle').value.trim();
  if (!title) { alert('Title required'); return; }
  let params = {};
  const pRaw = document.getElementById('propParams').value.trim();
  if (pRaw) { try { params = JSON.parse(pRaw); } catch(e) { alert('Invalid JSON in parameters field'); return; } }
  const msg = document.getElementById('propResult');
  try {
    const d = await apiFetch('/api/defi/governance/proposals', { method: 'POST', body: JSON.stringify({
      title, description: document.getElementById('propDesc').value, category: document.getElementById('propCategory').value,
      params, quorum: parseInt(document.getElementById('propQuorum').value) || 3
    })});
    msg.textContent = `✓ Proposal ${d.proposal_id} created`; msg.className='text-xs text-green-600 rounded px-2 py-1'; msg.classList.remove('hidden');
    document.getElementById('propTitle').value = ''; document.getElementById('propDesc').value = ''; document.getElementById('propParams').value = '';
    loadProposals();
  } catch(e) { msg.textContent = 'Error: ' + e.message; msg.className='text-xs text-red-500 rounded px-2 py-1'; msg.classList.remove('hidden'); }
}

async function voteProposal(id, vote) {
  try {
    await apiFetch(`/api/defi/governance/proposals/${id}/vote`, { method: 'POST', body: JSON.stringify({ vote }) });
    loadProposals();
  } catch(e) { alert('Error: ' + e.message); }
}

async function executeProposal(id) {
  try {
    const d = await apiFetch(`/api/defi/governance/proposals/${id}/execute`, { method: 'POST' });
    alert(`✓ Executed: ${d.result}`); loadProposals(); loadDefiAdmin();
  } catch(e) { alert('Error: ' + e.message); }
}

// ============================================================
// DeFi — Sub-tab Navigation (legacy, kept for compatibility)
// ============================================================
function showDefiSub(sub) {
  document.querySelectorAll('.defi-sub').forEach(el => el.classList.add('hidden'));
  document.getElementById('defi' + sub.charAt(0).toUpperCase() + sub.slice(1)).classList.remove('hidden');
  ['Swap','Stake','Escrow'].forEach(s => {
    const btn = document.getElementById('defiSub' + s);
    if (s.toLowerCase() === sub) { btn.className = 'px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-white'; }
    else { btn.className = 'px-4 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-400 hover:text-gray-800'; }
  });
  if (sub === 'swap') loadPools();
  if (sub === 'stake') loadStaking();
  if (sub === 'escrow') loadEscrows();
}

// ============================================================
// DeFi — Portfolio Summary
// ============================================================
async function loadDefiPortfolio() {
  try {
    const d = await apiFetch('/api/defi/portfolio');
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('pfBalance', '$' + Number(d.balance).toLocaleString('en-US', {minimumFractionDigits:2}));
    set('pfStaked',  '$' + Number(d.total_staked).toLocaleString('en-US', {minimumFractionDigits:2}));
    set('pfEscrow',  '$' + Number(d.locked_escrow).toLocaleString('en-US', {minimumFractionDigits:2}));
    set('pfYield',   '$' + Number(d.accrued_yield).toLocaleString('en-US', {minimumFractionDigits:4}));
  } catch(e) { console.error('Portfolio error', e); }
}

// ============================================================
// DeFi — AMM Swap
// ============================================================
async function loadPools() {
  try {
    const pools = await apiFetch('/api/defi/pools');
    const div = document.getElementById('poolsList');
    if (!pools.length) { div.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No pools available</p>'; return; }
    div.innerHTML = pools.map(p => `
      <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">${p.quote}</div>
          <div>
            <div class="text-sm font-semibold text-gray-800">${p.pair}</div>
            <div class="text-xs text-gray-400">Swaps: ${p.swap_count} · TVL: $${Number(p.tvl).toLocaleString()}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm font-semibold text-accent">${p.price.toFixed(p.price > 100 ? 2 : 6)}</div>
          <div class="text-xs text-gray-400">${p.base}/${p.quote}</div>
        </div>
      </div>`).join('');
  } catch(e) { console.error('Pools error', e); }
}

// Derive { pair, direction } from the FROM/TO token selectors
function getSwapParams() {
  const from = (document.getElementById('swapFromToken') || {}).value || 'USD';
  const to   = (document.getElementById('swapToToken')   || {}).value || 'EUR';
  if (from === 'USD') return { pair: `USD/${to}`,   direction: 'buy'  };
  if (to   === 'USD') return { pair: `USD/${from}`,  direction: 'sell' };
  return null; // cross-pair not directly supported
}

function onSwapTokenChange() {
  const from = document.getElementById('swapFromToken').value;
  const to   = document.getElementById('swapToToken').value;
  // Prevent same token on both sides
  if (from === to) {
    const toEl = document.getElementById('swapToToken');
    const opts = [...toEl.options].map(o => o.value).filter(v => v !== from);
    toEl.value = opts[0] || (from === 'USD' ? 'EUR' : 'USD');
  }
  document.getElementById('swapOut').textContent = '0';
  document.getElementById('swapPreview').classList.add('hidden');
  document.getElementById('swapImpactBadge').classList.add('hidden');
  previewSwap();
}

function flipSwap() {
  const fromEl = document.getElementById('swapFromToken');
  const toEl   = document.getElementById('swapToToken');
  const tmp = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value   = tmp;
  document.getElementById('swapAmountIn').value = '';
  document.getElementById('swapOut').textContent = '0';
  document.getElementById('swapPreview').classList.add('hidden');
  document.getElementById('swapImpactBadge').classList.add('hidden');
}

function previewSwap() {
  const amount = parseFloat(document.getElementById('swapAmountIn').value) || 0;
  const preview = document.getElementById('swapPreview');
  const outEl   = document.getElementById('swapOut');
  if (amount <= 0) {
    preview.classList.add('hidden');
    outEl.textContent = '0';
    return;
  }
  const params = getSwapParams();
  if (!params) {
    outEl.textContent = '—';
    preview.classList.add('hidden');
    return;
  }
  apiFetch('/api/defi/pools').then(pools => {
    const pool = pools.find(p => p.pair === params.pair);
    if (!pool) return;
    const rb = pool.reserve_base, rq = pool.reserve_quote, k = pool.k_constant || rb * rq;
    let out, spotPrice, execPrice;
    if (params.direction === 'buy') {
      const newRb = rb + amount;
      const newRq = k / newRb;
      out = rq - newRq;
      spotPrice = rq / rb;
      execPrice = amount / out;
    } else {
      const newRq = rq + amount;
      const newRb = k / newRq;
      out = rb - newRb;
      spotPrice = rb / rq;
      execPrice = amount / out;
    }
    const fee = out * 0.003;
    const outAfterFee = out - fee;
    const impact = Math.abs(execPrice - spotPrice) / spotPrice * 100;
    const decimals = outAfterFee > 100 ? 2 : 6;
    outEl.textContent = outAfterFee.toFixed(decimals);
    document.getElementById('swapRate').textContent = (amount / outAfterFee).toFixed(6);
    document.getElementById('swapImpact').textContent = impact.toFixed(4) + '%';
    document.getElementById('swapImpact').className = 'font-mono ' + (impact > 1 ? 'text-red-400' : 'text-green-400');
    document.getElementById('swapFee').textContent = fee.toFixed(6);
    preview.classList.remove('hidden');
    const badge = document.getElementById('swapImpactBadge');
    if (impact > 0.5) {
      badge.textContent = impact.toFixed(2) + '% impact';
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }).catch(e => console.error('Preview error', e));
}

async function executeSwap() {
  const amount = parseFloat(document.getElementById('swapAmountIn').value) || 0;
  if (amount <= 0) return;
  const params = getSwapParams();
  const res = document.getElementById('swapResult');
  if (!params) {
    res.className = 'text-xs mt-2 p-3 rounded-lg bg-red-500/10 text-red-400';
    res.innerHTML = '<i class="fas fa-times-circle mr-1"></i>Direct cross-pair swaps not supported. Use USD as one side.';
    res.classList.remove('hidden');
    return;
  }
  try {
    const result = await apiFetch('/api/defi/swap', { method: 'POST', body: JSON.stringify({ pair: params.pair, amount, direction: params.direction }) });
    const from = document.getElementById('swapFromToken').value;
    const to   = document.getElementById('swapToToken').value;
    res.className = 'text-xs mt-2 p-3 rounded-lg bg-green-500/10 text-green-400';
    res.innerHTML = `<i class="fas fa-check-circle mr-1"></i>${result.amount_in.toLocaleString()} ${from} → ${result.amount_out.toFixed(result.amount_out > 100 ? 2 : 6)} ${to} (Impact: ${result.price_impact}%) | Balance: $${result.new_balance.toLocaleString()}`;
    res.classList.remove('hidden');
    document.getElementById('swapAmountIn').value = '';
    document.getElementById('swapOut').textContent = '0';
    document.getElementById('swapPreview').classList.add('hidden');
    loadPools();
    loadDefiPortfolio();
    updateHeaderInfo();
  } catch(e) {
    res.className = 'text-xs mt-2 p-3 rounded-lg bg-red-500/10 text-red-400';
    res.innerHTML = '<i class="fas fa-times-circle mr-1"></i>' + (e.message || 'Swap failed');
    res.classList.remove('hidden');
  }
}

// ============================================================
// DeFi — Staking
// ============================================================
async function loadStaking() {
  try {
    const data = await apiFetch('/api/defi/staking');
    const div = document.getElementById('stakingPositions');
    const lockDays = { flexible: 0, '30day': 30, '90day': 90 };
    if (!data.positions.length) {
      div.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No staking positions yet. Stake funds to earn yield!</p>';
    } else {
      div.innerHTML = data.positions.map(p => {
        const statusColor = p.status === 'active' ? 'text-green-400 bg-green-500/10' : 'text-gray-400 bg-gray-500/10';
        const ld = lockDays[p.pool] || 0;
        let progressHtml = '';
        if (ld > 0 && p.status === 'active') {
          const pct = Math.min(100, (p.days_elapsed / ld) * 100);
          const daysLeft = Math.max(0, ld - p.days_elapsed);
          const barColor = daysLeft < 1 ? 'bg-red-400' : daysLeft < 7 ? 'bg-yellow-400' : 'bg-green-400';
          const textColor = daysLeft < 1 ? 'text-red-400' : daysLeft < 7 ? 'text-yellow-500' : 'text-green-500';
          progressHtml = `
            <div class="mt-2">
              <div class="flex justify-between text-[10px] mb-1">
                <span class="text-gray-400">Lock progress (${p.days_elapsed.toFixed(1)}/${ld}d)</span>
                <span class="${textColor} font-semibold">${daysLeft.toFixed(1)}d remaining</span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full ${barColor} rounded-full" style="width:${pct.toFixed(1)}%"></div>
              </div>
            </div>`;
        } else if (ld === 0 && p.status === 'active') {
          progressHtml = `<div class="mt-1 text-[10px] text-green-400"><i class="fas fa-unlock mr-1"></i>Flexible — unstake anytime</div>`;
        }
        return `<div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-gray-800">$${Number(p.amount).toLocaleString()} <span class="text-xs text-gray-400">· ${p.pool} · ${p.apy}% APY</span></div>
              <div class="text-xs text-gray-400 mt-0.5">Earned: <span class="text-accent font-semibold">$${p.accrued_yield.toFixed(4)}</span></div>
            </div>
            <div class="flex items-center gap-2 ml-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusColor} shrink-0">${p.status}</span>
              ${p.status === 'active' ? `<button onclick="unstake('${p.id}')" class="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 shrink-0">Unstake</button>` : ''}
            </div>
          </div>
          ${progressHtml}
        </div>`;
      }).join('');
    }
    const summary = document.getElementById('stakingSummary');
    if (data.total_staked > 0) {
      summary.classList.remove('hidden');
      document.getElementById('totalStaked').textContent = '$' + Number(data.total_staked).toLocaleString();
    } else { summary.classList.add('hidden'); }
  } catch(e) { console.error('Staking error', e); }
}

function updateStakePreview() {
  const pool = document.getElementById('stakePool').value;
  const amount = parseFloat(document.getElementById('stakeAmount').value) || 0;
  const preview = document.getElementById('stakePreview');
  if (amount <= 0) { preview.classList.add('hidden'); return; }
  preview.classList.remove('hidden');
  const apys = { flexible: 3.5, '30day': 5.2, '90day': 8.1 };
  const apy = apys[pool] || 3.5;
  document.getElementById('stakeAPY').textContent = apy + '%';
  document.getElementById('stakeYield30').textContent = '$' + (amount * apy / 365 / 100 * 30).toFixed(2);
  document.getElementById('stakeYieldAnnual').textContent = '$' + (amount * apy / 100).toFixed(2);
}

async function executeSstake() {
  const pool = document.getElementById('stakePool').value;
  const amount = parseFloat(document.getElementById('stakeAmount').value) || 0;
  if (amount <= 0) return;
  const res = document.getElementById('stakeResult');
  try {
    const result = await apiFetch('/api/defi/stake', { method: 'POST', body: JSON.stringify({ pool, amount }) });
    res.className = 'text-xs mt-2 p-3 rounded-lg bg-green-500/10 text-green-400';
    res.innerHTML = `<i class="fas fa-check-circle mr-1"></i>Staked $${result.amount.toLocaleString()} at ${result.apy}% APY | New Balance: $${result.new_balance.toLocaleString()}`;
    res.classList.remove('hidden');
    document.getElementById('stakeAmount').value = '';
    document.getElementById('stakePreview').classList.add('hidden');
    loadStaking();
    updateHeaderInfo();
  } catch(e) {
    res.className = 'text-xs mt-2 p-3 rounded-lg bg-red-500/10 text-red-400';
    res.innerHTML = '<i class="fas fa-times-circle mr-1"></i>' + (e.message || 'Stake failed');
    res.classList.remove('hidden');
  }
}

async function unstake(id) {
  if (!confirm('Unstake this position and collect yield?')) return;
  try {
    const result = await apiFetch('/api/defi/unstake/' + id, { method: 'POST' });
    alert(`Unstaked! Principal: $${result.principal.toLocaleString()}, Yield: $${result.yield.toFixed(2)}, Total: $${result.total.toFixed(2)}`);
    loadStaking();
    updateHeaderInfo();
  } catch(e) { alert('Unstake failed: ' + (e.message || 'Unknown error')); }
}

// ============================================================
// DeFi — HTLC Escrow
// ============================================================
let _escrowTimerInterval = null;

function updateEscrowCountdowns() {
  document.querySelectorAll('.escrow-countdown').forEach(el => {
    const expiry = new Date(el.dataset.expiry);
    const diff = expiry - Date.now();
    if (diff <= 0) {
      el.textContent = 'Expired';
      el.className = 'escrow-countdown text-xs font-semibold text-red-400';
    } else {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const txt = h >= 48 ? `${Math.floor(h/24)}d ${h%24}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
      el.textContent = txt;
      el.className = 'escrow-countdown text-xs font-semibold ' + (h < 1 ? 'text-red-400' : h < 6 ? 'text-yellow-500' : 'text-green-500');
    }
  });
}

function startEscrowCountdowns() {
  if (_escrowTimerInterval) clearInterval(_escrowTimerInterval);
  updateEscrowCountdowns();
  _escrowTimerInterval = setInterval(updateEscrowCountdowns, 30000);
}

async function loadEscrows() {
  try {
    const escrows = await apiFetch('/api/defi/escrow');
    const div = document.getElementById('escrowList');
    if (!escrows.length) { div.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No escrow contracts. Create one to get started!</p>'; return; }
    const colors = { locked: 'text-yellow-400 bg-yellow-500/10', claimed: 'text-green-400 bg-green-500/10', refunded: 'text-blue-400 bg-blue-500/10', expired: 'text-red-400 bg-red-500/10' };
    div.innerHTML = escrows.map(e => {
      const sc = colors[e.status] || 'text-gray-400 bg-gray-500/10';
      const role = e.is_sender ? 'Sender' : 'Receiver';
      const other = e.is_sender ? e.receiver : e.sender;
      let actions = '';
      if (e.status === 'locked' && !e.is_sender) {
        actions = `<button onclick="claimEscrow('${e.id}')" class="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-semibold">Claim</button>`;
      }
      if ((e.status === 'locked' || e.status === 'expired') && e.is_sender) {
        actions = `<button onclick="refundEscrow('${e.id}')" class="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-semibold">Refund</button>`;
      }
      const timerHtml = e.status === 'locked'
        ? `<span class="escrow-countdown text-xs font-semibold text-green-500 ml-2" data-expiry="${e.timelock}">…</span>`
        : '';
      return `<div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gray-800">$${Number(e.amount).toLocaleString()} <span class="text-xs text-gray-400">→ ${other} (${role})</span></div>
            <div class="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-2">
              <span>Hashlock: ${e.hashlock.substring(0,12)}…</span>
              ${timerHtml}
            </div>
            ${e.is_sender && e.status === 'locked' ? `<div class="text-xs text-yellow-500 mt-1 flex items-center gap-1"><i class="fas fa-key text-[10px]"></i>Secret: <code class="bg-white px-1 rounded border border-gray-200 break-all">${e.secret}</code></div>` : ''}
          </div>
          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <span class="px-2 py-0.5 rounded-full text-xs font-bold ${sc}">${e.status}</span>
            ${actions}
          </div>
        </div>
      </div>`;
    }).join('');
    startEscrowCountdowns();
  } catch(e) { console.error('Escrow error', e); }
}

async function createEscrow() {
  const receiver = document.getElementById('escrowReceiver').value.trim();
  const amount = parseFloat(document.getElementById('escrowAmount').value) || 0;
  const timelock_hours = parseInt(document.getElementById('escrowTimelock').value) || 24;
  if (!receiver || amount <= 0) return;
  const res = document.getElementById('escrowResult');
  try {
    const result = await apiFetch('/api/defi/escrow/create', { method: 'POST', body: JSON.stringify({ receiver, amount, timelock_hours }) });
    res.className = 'text-xs mt-2 p-3 rounded-lg bg-green-500/10 text-green-400';
    res.innerHTML = `<i class="fas fa-check-circle mr-1"></i>Escrow created! Share this secret with ${receiver}:<br><code class="bg-gray-100 px-2 py-1 rounded mt-1 block break-all text-yellow-400">${result.secret}</code>`;
    res.classList.remove('hidden');
    document.getElementById('escrowReceiver').value = '';
    document.getElementById('escrowAmount').value = '';
    loadEscrows();
    updateHeaderInfo();
    loadDefiPortfolio();
  } catch(e) {
    res.className = 'text-xs mt-2 p-3 rounded-lg bg-red-500/10 text-red-400';
    res.innerHTML = '<i class="fas fa-times-circle mr-1"></i>' + (e.message || 'Failed');
    res.classList.remove('hidden');
  }
}

async function claimEscrow(id) {
  const secret = prompt('Enter the secret pre-image to claim funds:');
  if (!secret) return;
  try {
    const result = await apiFetch('/api/defi/escrow/' + id + '/claim', { method: 'POST', body: JSON.stringify({ secret }) });
    alert(`Claimed $${result.amount.toLocaleString()}! New balance: $${result.new_balance.toLocaleString()}`);
    loadEscrows();
    updateHeaderInfo();
    loadDefiPortfolio();
  } catch(e) { alert('Claim failed: ' + (e.message || 'Invalid secret')); }
}

async function refundEscrow(id) {
  if (!confirm('Refund this escrow? Only works after timelock expires.')) return;
  try {
    const result = await apiFetch('/api/defi/escrow/' + id + '/refund', { method: 'POST' });
    alert(`Refunded $${result.amount.toLocaleString()}! New balance: $${result.new_balance.toLocaleString()}`);
    loadEscrows();
    updateHeaderInfo();
    loadDefiPortfolio();
  } catch(e) { alert('Refund failed: ' + (e.message || 'Timelock not expired')); }
}
