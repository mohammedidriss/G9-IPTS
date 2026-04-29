// ============================================================
// tab-compliance.js — Compliance tab: Sanctions, Nostro, GPI, GDPR
// ============================================================

async function loadSanctions() {
  try {
    const data = await apiFetch('/api/compliance/sanctions');
    const tbody = document.getElementById('sanctionsBody');
    if (!data.sanctions || data.sanctions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-600">No sanctions entries</td></tr>';
      return;
    }
    tbody.innerHTML = data.sanctions.map(s => `
      <tr class="border-b border-gray-200/50">
        <td class="py-1.5 px-2 text-red-400">${s.entity_name}</td>
        <td class="py-1.5 px-2">${s.entity_type}</td>
        <td class="py-1.5 px-2 text-accent">${s.added_by || 'system'}</td>
        <td class="py-1.5 px-2 text-gray-500">${s.created_at || ''}</td>
      </tr>
    `).join('');
  } catch (e) { console.error('Sanctions error:', e); }
}

async function addSanction() {
  const name = document.getElementById('sanctionName').value;
  const type = document.getElementById('sanctionType').value;
  if (!name) return alert('Enter entity name');
  try {
    await apiFetch('/api/compliance/sanctions', {
      method: 'POST',
      body: JSON.stringify({ entity_name: name, entity_type: type })
    });
    document.getElementById('sanctionName').value = '';
    loadSanctions();
  } catch (e) { alert('Error: ' + e.message); }
}

async function trackGPI() {
  const uetr = document.getElementById('gpiUetr').value;
  if (!uetr) return alert('Enter a UETR');
  try {
    const data = await apiFetch(`/api/compliance/swift-gpi/${uetr}`);
    document.getElementById('gpiResult').innerHTML = `
      <div class="bg-gray-100 rounded-lg p-4 fade-in space-y-2">
        <div class="flex justify-between"><span class="text-gray-500">UETR</span><span class="font-mono text-accent">${data.uetr}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">Status</span><span class="text-green-400 font-bold">${data.status}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">Amount</span><span>$${Number(data.amount).toLocaleString()} ${data.currency}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">Beneficiary</span><span>${data.beneficiary}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">Created</span><span class="text-gray-400">${data.created_at}</span></div>
      </div>
    `;
  } catch (e) {
    document.getElementById('gpiResult').innerHTML = `<p class="text-red-400">UETR not found</p>`;
  }
}

async function loadNostro() {
  try {
    const data = await apiFetch('/api/dashboard');
    const container = document.getElementById('nostroBalances');
    const nostroUsd = data.nostro_liquidity_usd || 0;
    if (data.accounts && data.accounts.length > 0) {
      container.innerHTML = `
        <div class="bg-gray-100 rounded-lg p-3">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-xs text-gray-500">Primary Nostro Account</p>
              <p class="font-mono text-sm text-accent mt-1">${data.accounts[0]}</p>
            </div>
            <p class="text-2xl font-bold text-blue-400">$${Number(nostroUsd).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
          </div>
        </div>
        ${data.accounts.slice(1).map((a, i) => `
          <div class="bg-gray-100 rounded-lg p-3">
            <div class="flex justify-between items-center">
              <p class="font-mono text-xs text-gray-500">${a.substring(0, 22)}...</p>
              <p class="text-sm text-gray-400">Account ${i + 1}</p>
            </div>
          </div>
        `).join('')}
      `;
    } else {
      container.innerHTML = '<p class="text-gray-600">No accounts available</p>';
    }
  } catch (e) { console.error('Nostro error:', e); }
}

async function gdprErase() {
  const entityId = document.getElementById('gdprEntityId') && document.getElementById('gdprEntityId').value;
  if (!entityId) return;
  if (!confirm(`Are you sure you want to erase all data for "${entityId}"? This cannot be undone.`)) return;
  try {
    const data = await apiFetch('/api/gdpr/erasure', { method: 'POST', body: JSON.stringify({ entity_id: entityId }) });
    alert(`Erasure complete. ${data.records_affected} records affected.`);
    document.getElementById('gdprEntityId').value = '';
  } catch (e) { alert('Error: ' + e.message); }
}

// ============================================================
// Entry point — loads all 10 new compliance features
// ============================================================
function loadComplianceFeatures() {
  loadRegCalendar();
  renderAmlRules();
  renderCorrBanks();
  renderWatchlistScreening();
  renderTravelRule();
  renderCTR();
  renderUBO();
  renderPolicyLibrary();
  renderRiskAppetite();
  renderTPDD();
}

// ── Helpers ──────────────────────────────────────────────────
function _compBadge(text, color) {
  const map = { green:'bg-green-100 text-green-700', red:'bg-red-100 text-red-600', yellow:'bg-yellow-100 text-yellow-700', blue:'bg-blue-100 text-blue-600', gray:'bg-gray-100 text-gray-500', purple:'bg-purple-100 text-purple-600', orange:'bg-orange-100 text-orange-600' };
  return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[color]||map.gray}">${text}</span>`;
}
function _daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

// ============================================================
// 1. Regulatory Reporting Calendar
// ============================================================
const _regReports = [
  { id:'CTR-Q1',   name:'CTR Quarterly Filing',       framework:'FinCEN',   due:'2026-07-15', status:'pending',  filed:null },
  { id:'SAR-MAY',  name:'SAR Monthly Report',          framework:'FinCEN',   due:'2026-05-10', status:'overdue',  filed:null },
  { id:'FATF-H1',  name:'FATF Compliance Report',      framework:'FATF',     due:'2026-06-30', status:'pending',  filed:null },
  { id:'BSA-ANN',  name:'BSA Annual Report',           framework:'BSA',      due:'2026-12-31', status:'pending',  filed:null },
  { id:'OFAC-Q2',  name:'OFAC Screening Summary',      framework:'OFAC',     due:'2026-06-15', status:'pending',  filed:null },
  { id:'AML-MAR',  name:'AML Risk Assessment',         framework:'Internal', due:'2026-05-01', status:'filed',    filed:'2026-04-28' },
  { id:'CDD-Q1',   name:'CDD Periodic Review',         framework:'BASEL',    due:'2026-05-20', status:'pending',  filed:null },
  { id:'GDPR-ANN', name:'Data Protection Impact Report',framework:'GDPR',    due:'2026-08-01', status:'pending',  filed:null },
  { id:'CBDC-Q2',  name:'CBDC Settlement Report',      framework:'BIS',      due:'2026-07-01', status:'pending',  filed:null },
];

function loadRegCalendar() {
  const el = document.getElementById('regCalendarGrid');
  if (!el) return;
  el.innerHTML = _regReports.map((r,i) => {
    const days = r.status === 'filed' ? null : _daysUntil(r.due);
    const urgency = r.status === 'filed' ? 'green' : r.status === 'overdue' ? 'red' : days <= 7 ? 'red' : days <= 30 ? 'yellow' : 'blue';
    const borderColor = { green:'border-green-400', red:'border-red-400', yellow:'border-yellow-400', blue:'border-indigo-400' }[urgency];
    const dueLabel = r.status === 'filed' ? `Filed ${r.filed}` : r.status === 'overdue' ? 'OVERDUE' : `Due in ${days}d`;
    return `<div class="rounded-xl p-4 border-l-4 ${borderColor} bg-gray-50">
      <div class="flex items-start justify-between mb-1">
        <p class="text-xs font-semibold text-gray-800 leading-tight">${r.name}</p>
        ${_compBadge(r.framework, 'gray')}
      </div>
      <p class="text-[10px] text-gray-400 mb-2">Due: ${r.due}</p>
      <div class="flex items-center justify-between">
        ${_compBadge(dueLabel, urgency)}
        ${r.status !== 'filed' ? `<button onclick="regFileMark(${i})" class="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition">Mark Filed</button>` : '<span class="text-[10px] text-green-500"><i class="fas fa-check mr-1"></i>Complete</span>'}
      </div>
    </div>`;
  }).join('');
}

function regFileMark(idx) {
  _regReports[idx].status = 'filed';
  _regReports[idx].filed = new Date().toISOString().slice(0,10);
  loadRegCalendar();
  showToast(`${_regReports[idx].id} marked as filed`, 'success');
}

// ============================================================
// 2. AML Transaction Monitoring Rules
// ============================================================
const _amlRules = [
  { id:'R001', name:'Large Cash Transaction',        desc:'Flag single cash txn > $10,000',               hits:47,  enabled:true,  severity:'high' },
  { id:'R002', name:'Structuring Detection',          desc:'3+ txns same beneficiary within 24h < $10K ea', hits:12,  enabled:true,  severity:'critical' },
  { id:'R003', name:'High-Risk Corridor Alert',       desc:'Any txn to FATF grey-list country > $5,000',   hits:89,  enabled:true,  severity:'high' },
  { id:'R004', name:'Rapid Fund Movement',            desc:'Funds in & out within 48h same account',        hits:6,   enabled:true,  severity:'medium' },
  { id:'R005', name:'PEP Transaction Flag',           desc:'Any txn involving politically exposed person',  hits:3,   enabled:true,  severity:'high' },
  { id:'R006', name:'Round Amount Suspicion',         desc:'Exact round amounts > $50K flagged',            hits:22,  enabled:false, severity:'medium' },
  { id:'R007', name:'New Account High Volume',        desc:'Account < 30 days with txn > $25,000',          hits:8,   enabled:true,  severity:'high' },
  { id:'R008', name:'Dormant Account Activity',       desc:'Account inactive 90d+ suddenly active > $1K',  hits:4,   enabled:true,  severity:'medium' },
];

function renderAmlRules() {
  const el = document.getElementById('amlRulesList');
  if (!el) return;
  const active = _amlRules.filter(r=>r.enabled).length;
  const sumEl = document.getElementById('amlRulesSummary');
  if (sumEl) sumEl.textContent = `${active} active · ${_amlRules.length} total`;
  el.innerHTML = _amlRules.map((r,i) => {
    const sevColor = { critical:'text-red-500', high:'text-orange-500', medium:'text-yellow-600' }[r.severity]||'text-gray-400';
    return `<div class="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 ${r.enabled?'':'opacity-50'}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-[10px] font-mono text-gray-400">${r.id}</span>
          <span class="text-xs font-semibold text-gray-800">${r.name}</span>
          <span class="text-[10px] font-semibold ${sevColor}">${r.severity}</span>
        </div>
        <p class="text-[10px] text-gray-500">${r.desc}</p>
      </div>
      <div class="text-center shrink-0">
        <p class="text-sm font-bold text-accent">${r.hits}</p>
        <p class="text-[10px] text-gray-400">hits</p>
      </div>
      <label class="relative inline-flex cursor-pointer shrink-0">
        <input type="checkbox" class="sr-only peer" ${r.enabled?'checked':''} onchange="amlToggleRule(${i},this.checked)">
        <div class="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
      </label>
    </div>`;
  }).join('');
}

function amlToggleRule(idx, val) {
  _amlRules[idx].enabled = val;
  renderAmlRules();
  showToast(`Rule "${_amlRules[idx].id}" ${val?'enabled':'disabled'}`, val?'success':'info');
}

// ============================================================
// 3. Correspondent Bank Registry
// ============================================================
const _corrBanks = [
  { name:'HSBC Bank plc',           country:'UK',          risk:'low',    dd:'completed', lastReview:'2025-11-15', nextReview:'2026-11-15', status:'active' },
  { name:'Deutsche Bank AG',        country:'Germany',     risk:'low',    dd:'completed', lastReview:'2025-09-01', nextReview:'2026-09-01', status:'active' },
  { name:'Emirates NBD',            country:'UAE',         risk:'medium', dd:'completed', lastReview:'2026-01-20', nextReview:'2026-07-20', status:'active' },
  { name:'Al Rajhi Bank',           country:'Saudi Arabia',risk:'medium', dd:'in_progress',lastReview:'2025-12-01',nextReview:'2026-06-01', status:'review' },
  { name:'First Bank of Nigeria',   country:'Nigeria',     risk:'high',   dd:'pending',   lastReview:'2025-06-10', nextReview:'2026-06-10', status:'suspended' },
  { name:'Sberbank',                country:'Russia',      risk:'high',   dd:'failed',    lastReview:'2023-02-01', nextReview:'N/A',        status:'terminated' },
  { name:'Standard Chartered',      country:'Singapore',   risk:'low',    dd:'completed', lastReview:'2026-02-14', nextReview:'2027-02-14', status:'active' },
];

function renderCorrBanks() {
  const tbody = document.getElementById('corrBankBody');
  if (!tbody) return;
  const el = document.getElementById('corrBankSummary');
  if (el) el.textContent = `${_corrBanks.filter(b=>b.status==='active').length} active · ${_corrBanks.filter(b=>b.risk==='high').length} high-risk`;
  const riskC = { low:'green', medium:'yellow', high:'red' };
  const statusC = { active:'green', review:'yellow', suspended:'orange', terminated:'red' };
  tbody.innerHTML = _corrBanks.map(b => `
    <tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="py-2 px-3 font-medium text-gray-800">${b.name}</td>
      <td class="py-2 px-3 text-gray-500">${b.country}</td>
      <td class="py-2 px-3">${_compBadge(b.risk, riskC[b.risk])}</td>
      <td class="py-2 px-3">${_compBadge(b.dd.replace('_',' '), b.dd==='completed'?'green':b.dd==='in_progress'?'blue':b.dd==='pending'?'yellow':'red')}</td>
      <td class="py-2 px-3 text-gray-400">${b.lastReview}</td>
      <td class="py-2 px-3 text-gray-400">${b.nextReview}</td>
      <td class="py-2 px-3 text-center">${_compBadge(b.status, statusC[b.status]||'gray')}</td>
    </tr>`).join('');
}

// ============================================================
// 4. Watchlist Screening Results
// ============================================================
const _watchlistResults = [
  { id:'WL-0091', entity:'Hassan Al-Rashid',     list:'OFAC SDN',    score:94, status:'matched',  ts:Date.now()-1800000 },
  { id:'WL-0090', entity:'Pacific Star Trading', list:'UN Sanctions', score:87, status:'pending',  ts:Date.now()-3600000 },
  { id:'WL-0089', entity:'Maria Santos',         list:'OFAC SDN',    score:42, status:'cleared',   ts:Date.now()-7200000 },
  { id:'WL-0088', entity:'Volkov Enterprises',   list:'EU Sanctions', score:91, status:'matched',  ts:Date.now()-86400000 },
  { id:'WL-0087', entity:'Ahmed Al-Farsi',       list:'OFAC SDN',    score:35, status:'cleared',   ts:Date.now()-90000000 },
  { id:'WL-0086', entity:'BTC Swaps Ltd',        list:'FinCEN',      score:78, status:'pending',  ts:Date.now()-172800000 },
  { id:'WL-0085', entity:'Nadia Kovacs',         list:'Interpol',    score:61, status:'pending',  ts:Date.now()-200000000 },
];

function renderWatchlistScreening() {
  const el = document.getElementById('watchlistScreeningList');
  if (!el) return;
  const filter = (document.getElementById('wlScreenFilter')||{value:'all'}).value;
  const items = filter === 'all' ? _watchlistResults : _watchlistResults.filter(r=>r.status===filter);
  const stC = { matched:'red', pending:'yellow', cleared:'green' };
  el.innerHTML = items.map((r,i) => `
    <div class="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5 flex-wrap">
          <span class="text-[10px] font-mono text-gray-400">${r.id}</span>
          <span class="text-xs font-semibold text-gray-800">${r.entity}</span>
          ${_compBadge(r.list, 'blue')}
        </div>
        <p class="text-[10px] text-gray-400">${new Date(r.ts).toLocaleString()}</p>
      </div>
      <div class="text-center shrink-0">
        <p class="text-sm font-bold ${r.score>=80?'text-red-500':r.score>=60?'text-orange-400':'text-green-500'}">${r.score}%</p>
        <p class="text-[10px] text-gray-400">match</p>
      </div>
      ${_compBadge(r.status, stC[r.status]||'gray')}
      ${r.status==='pending' ? `
        <div class="flex gap-1 shrink-0">
          <button onclick="wlResolve(${i},'matched')" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition">Confirm</button>
          <button onclick="wlResolve(${i},'cleared')" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition">Clear</button>
        </div>` : ''}
    </div>`).join('') || '<p class="text-gray-400 text-xs text-center py-6">No results</p>';
}

function wlResolve(idx, status) {
  _watchlistResults[idx].status = status;
  renderWatchlistScreening();
  showToast(`${_watchlistResults[idx].id} marked as ${status}`, status==='cleared'?'success':'warning');
}

// ============================================================
// 5. Travel Rule Compliance
// ============================================================
const _travelRuleData = [
  { id:'TXN-10041', amount:25000, originator:'complete', beneficiary:'complete', status:'compliant' },
  { id:'TXN-10042', amount:15500, originator:'complete', beneficiary:'missing',  status:'non_compliant' },
  { id:'TXN-10043', amount:8200,  originator:'missing',  beneficiary:'complete', status:'non_compliant' },
  { id:'TXN-10044', amount:42000, originator:'complete', beneficiary:'complete', status:'compliant' },
  { id:'TXN-10045', amount:11750, originator:'partial',  beneficiary:'complete', status:'pending' },
  { id:'TXN-10046', amount:67000, originator:'complete', beneficiary:'partial',  status:'pending' },
  { id:'TXN-10047', amount:5300,  originator:'complete', beneficiary:'complete', status:'compliant' },
];

function renderTravelRule() {
  const tbody = document.getElementById('travelRuleBody');
  if (!tbody) return;
  const compliant = _travelRuleData.filter(t=>t.status==='compliant').length;
  const sumEl = document.getElementById('travelRuleSummary');
  if (sumEl) sumEl.textContent = `${compliant}/${_travelRuleData.length} compliant`;
  const stC = { compliant:'green', non_compliant:'red', pending:'yellow' };
  const infoC = { complete:'green', missing:'red', partial:'yellow' };
  tbody.innerHTML = _travelRuleData.map(t => `
    <tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="py-2 px-3 font-mono text-xs text-gray-700">${t.id}</td>
      <td class="py-2 px-3 text-right font-semibold text-gray-800">$${t.amount.toLocaleString()}</td>
      <td class="py-2 px-3">${_compBadge(t.originator, infoC[t.originator])}</td>
      <td class="py-2 px-3">${_compBadge(t.beneficiary, infoC[t.beneficiary])}</td>
      <td class="py-2 px-3 text-center">${_compBadge(t.status.replace('_',' '), stC[t.status])}</td>
    </tr>`).join('');
}

// ============================================================
// 6. Currency Transaction Reports (CTR)
// ============================================================
const _ctrData = [
  { id:'CTR-2024-001', entity:'Al Noor Trading LLC', amount:45000,  date:'2026-04-28', status:'filed',   ref:'FINCEN-REF-001' },
  { id:'CTR-2024-002', entity:'John Smith',           amount:12500,  date:'2026-04-27', status:'pending', ref:null },
  { id:'CTR-2024-003', entity:'Pacific Imports Co.',  amount:78000,  date:'2026-04-25', status:'pending', ref:null },
  { id:'CTR-2024-004', entity:'Emirates Global FZE',  amount:250000, date:'2026-04-22', status:'filed',   ref:'FINCEN-REF-002' },
  { id:'CTR-2024-005', entity:'Mohammed Al-Hamdan',   amount:15000,  date:'2026-04-20', status:'exempt',  ref:'EXEMPT-BANK' },
  { id:'CTR-2024-006', entity:'Global Logistics Ltd', amount:32000,  date:'2026-04-18', status:'pending', ref:null },
];

function renderCTR() {
  const tbody = document.getElementById('ctrBody');
  if (!tbody) return;
  const pending = _ctrData.filter(c=>c.status==='pending').length;
  const sumEl = document.getElementById('ctrSummary');
  if (sumEl) sumEl.textContent = `${pending} pending filing · ${_ctrData.length} total`;
  const stC = { filed:'green', pending:'yellow', exempt:'gray' };
  tbody.innerHTML = _ctrData.map((c,i) => `
    <tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="py-2 px-3 font-mono text-xs text-gray-700">${c.id}</td>
      <td class="py-2 px-3 text-gray-800">${c.entity}</td>
      <td class="py-2 px-3 text-right font-semibold text-gray-800">$${c.amount.toLocaleString()}</td>
      <td class="py-2 px-3 text-gray-400">${c.date}</td>
      <td class="py-2 px-3 text-center">${_compBadge(c.status, stC[c.status])}</td>
      <td class="py-2 px-3 text-center">
        ${c.status==='pending' ? `<button onclick="ctrFile(${i})" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition">File CTR</button>` :
          c.status==='filed' ? `<span class="text-[10px] font-mono text-gray-400">${c.ref}</span>` : '—'}
      </td>
    </tr>`).join('');
}

function ctrFile(idx) {
  _ctrData[idx].status = 'filed';
  _ctrData[idx].ref = 'FINCEN-REF-' + String(Math.floor(Math.random()*9000)+1000);
  renderCTR();
  showToast(`${_ctrData[idx].id} filed with FinCEN`, 'success');
}

// ============================================================
// 7. Beneficial Ownership Registry (UBO)
// ============================================================
const _uboData = [
  { entity:'Al Noor Trading LLC',   ubo:'Khalid Al-Mansoori',  ownership:65, verified:true,  expires:'2026-12-01', risk:'low' },
  { entity:'Pacific Imports Co.',   ubo:'Wei Zhang',            ownership:51, verified:true,  expires:'2026-08-15', risk:'medium' },
  { entity:'Global Logistics Ltd',  ubo:'Unknown',              ownership:null,verified:false, expires:null,         risk:'high' },
  { entity:'Emirates Global FZE',   ubo:'Fatima Al-Rashid',    ownership:100,verified:true,  expires:'2027-01-10', risk:'low' },
  { entity:'BTC Swaps Ltd',         ubo:'Pending Investigation',ownership:null,verified:false, expires:null,         risk:'high' },
  { entity:'Sunrise Ventures',      ubo:'Carlos Mendez',        ownership:72, verified:true,  expires:'2026-06-30', risk:'medium' },
];

function renderUBO() {
  const el = document.getElementById('uboList');
  if (!el) return;
  const unverified = _uboData.filter(u=>!u.verified).length;
  const sumEl = document.getElementById('uboSummary');
  if (sumEl) sumEl.textContent = `${unverified} unverified · ${_uboData.length} total`;
  const riskC = { low:'green', medium:'yellow', high:'red' };
  el.innerHTML = _uboData.map(u => {
    const expiring = u.expires && _daysUntil(u.expires) <= 60;
    return `<div class="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border ${!u.verified?'border-red-200':'border-gray-100'}">
      <div class="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
        <i class="fas fa-user text-accent text-sm"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-gray-800">${u.entity}</p>
        <p class="text-[10px] text-gray-500">UBO: <span class="font-medium text-gray-700">${u.ubo}</span>${u.ownership?` · ${u.ownership}% ownership`:''}</p>
        ${u.expires ? `<p class="text-[10px] ${expiring?'text-orange-500':'text-gray-400'}">Expires: ${u.expires}${expiring?' ⚠️':''}</p>` : ''}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${_compBadge(u.risk, riskC[u.risk])}
        ${u.verified ? _compBadge('Verified','green') : _compBadge('Unverified','red')}
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// 8. Policy & Procedure Library
// ============================================================
const _policies = [
  { id:'POL-001', name:'AML Policy',                   version:'v4.2', reviewed:'2026-01-15', nextReview:'2027-01-15', status:'current' },
  { id:'POL-002', name:'KYC / CDD Procedures',          version:'v3.1', reviewed:'2025-11-01', nextReview:'2026-11-01', status:'current' },
  { id:'POL-003', name:'Sanctions Screening Policy',    version:'v2.8', reviewed:'2026-02-20', nextReview:'2026-08-20', status:'current' },
  { id:'POL-004', name:'Travel Rule Compliance Guide',  version:'v1.4', reviewed:'2025-08-10', nextReview:'2026-02-10', status:'overdue' },
  { id:'POL-005', name:'Data Retention Policy',         version:'v2.0', reviewed:'2025-12-05', nextReview:'2026-12-05', status:'current' },
  { id:'POL-006', name:'Incident Response Playbook',    version:'v1.9', reviewed:'2026-03-01', nextReview:'2026-09-01', status:'current' },
  { id:'POL-007', name:'PEP Management Procedures',     version:'v1.2', reviewed:'2025-07-20', nextReview:'2026-01-20', status:'overdue' },
  { id:'POL-008', name:'Correspondent Banking Policy',  version:'v3.0', reviewed:'2026-04-01', nextReview:'2027-04-01', status:'current' },
];

function renderPolicyLibrary() {
  const el = document.getElementById('policyLibrary');
  if (!el) return;
  el.innerHTML = _policies.map(p => {
    const overdue = p.status === 'overdue';
    return `<div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border ${overdue?'border-orange-300':'border-gray-100'}">
      <div class="w-9 h-9 rounded-lg ${overdue?'bg-orange-100':'bg-yellow-100'} flex items-center justify-center shrink-0">
        <i class="fas fa-file-lines ${overdue?'text-orange-500':'text-yellow-600'} text-sm"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-gray-800">${p.name}</p>
        <p class="text-[10px] text-gray-400">${p.id} · ${p.version} · Reviewed: ${p.reviewed}</p>
        <p class="text-[10px] ${overdue?'text-orange-500':'text-gray-400'}">Next review: ${p.nextReview}</p>
      </div>
      ${_compBadge(overdue?'Overdue':'Current', overdue?'orange':'green')}
    </div>`;
  }).join('');
}

// ============================================================
// 9. Risk Appetite Dashboard
// ============================================================
const _riskAppetite = [
  { label:'Single Txn Limit',     used:350000,  limit:500000,  currency:'USD', unit:'$' },
  { label:'Daily Volume',          used:2800000, limit:5000000, currency:'USD', unit:'$' },
  { label:'High-Risk Corridors',   used:12,      limit:20,      currency:'',    unit:'' },
  { label:'PEP Exposure',          used:3,       limit:10,      currency:'',    unit:'clients' },
  { label:'Monthly SAR Filings',   used:7,       limit:15,      currency:'',    unit:'' },
  { label:'Unverified UBO Clients',used:2,       limit:5,       currency:'',    unit:'' },
];

function renderRiskAppetite() {
  const el = document.getElementById('riskAppetiteGrid');
  if (!el) return;
  el.innerHTML = _riskAppetite.map(r => {
    const pct = Math.min(100, Math.round(r.used/r.limit*100));
    const color = pct>=90?'#ef4444':pct>=70?'#f97316':pct>=50?'#eab308':'#22c55e';
    const fmt = v => r.unit==='$' ? `$${Number(v).toLocaleString()}` : `${v}${r.unit?' '+r.unit:''}`;
    return `<div class="glass rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-semibold text-gray-700">${r.label}</p>
        <span class="text-xs font-bold" style="color:${color}">${pct}%</span>
      </div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div class="h-full rounded-full transition-all" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="flex justify-between text-[10px] text-gray-400">
        <span>Used: <span class="font-semibold text-gray-600">${fmt(r.used)}</span></span>
        <span>Limit: <span class="font-semibold text-gray-600">${fmt(r.limit)}</span></span>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// 10. Third-Party Due Diligence Tracker
// ============================================================
const _tpddData = [
  { name:'Temenos AG',          category:'Core Banking',   kyb:'verified',    risk:22, contractExpiry:'2027-06-30', lastReview:'2026-01-10' },
  { name:'Refinitiv / LSEG',    category:'Data Provider',  kyb:'verified',    risk:18, contractExpiry:'2026-12-31', lastReview:'2026-02-01' },
  { name:'AWS GovCloud',        category:'Infrastructure', kyb:'verified',    risk:15, contractExpiry:'2027-03-15', lastReview:'2026-03-20' },
  { name:'Chainalysis',         category:'Blockchain AML', kyb:'verified',    risk:20, contractExpiry:'2026-09-01', lastReview:'2025-12-05' },
  { name:'BioConnect Ltd',      category:'KYC Provider',   kyb:'in_review',   risk:45, contractExpiry:'2026-07-01', lastReview:'2025-11-15' },
  { name:'PayRoute FZE',        category:'Payment Rail',   kyb:'pending',     risk:67, contractExpiry:'2026-05-30', lastReview:'2025-10-01' },
  { name:'DataSafe Analytics',  category:'Analytics',      kyb:'failed',      risk:88, contractExpiry:'2026-04-15', lastReview:'2025-09-20' },
];

function renderTPDD() {
  const tbody = document.getElementById('tpddBody');
  if (!tbody) return;
  const issues = _tpddData.filter(t=>t.kyb!=='verified'||t.risk>=60).length;
  const sumEl = document.getElementById('tpddSummary');
  if (sumEl) sumEl.textContent = `${issues} requiring attention · ${_tpddData.length} vendors`;
  const kybC = { verified:'green', in_review:'blue', pending:'yellow', failed:'red' };
  tbody.innerHTML = _tpddData.map((t,i) => {
    const riskColor = t.risk>=70?'text-red-500':t.risk>=40?'text-orange-400':'text-green-500';
    const expiring = _daysUntil(t.contractExpiry) <= 60;
    return `<tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="py-2 px-3 font-medium text-gray-800">${t.name}</td>
      <td class="py-2 px-3">${_compBadge(t.category,'gray')}</td>
      <td class="py-2 px-3">${_compBadge(t.kyb.replace('_',' '), kybC[t.kyb])}</td>
      <td class="py-2 px-3 text-center font-bold text-sm ${riskColor}">${t.risk}</td>
      <td class="py-2 px-3 ${expiring?'text-orange-500 font-semibold':'text-gray-400'}">${t.contractExpiry}${expiring?' ⚠️':''}</td>
      <td class="py-2 px-3 text-gray-400">${t.lastReview}</td>
      <td class="py-2 px-3 text-center">
        <button onclick="tpddReview(${i})" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-cyan-100 text-cyan-600 hover:bg-cyan-200 transition">Review</button>
      </td>
    </tr>`;
  }).join('');
}

function tpddReview(idx) {
  _tpddData[idx].lastReview = new Date().toISOString().slice(0,10);
  renderTPDD();
  showToast(`Due diligence review recorded for ${_tpddData[idx].name}`, 'success');
}
