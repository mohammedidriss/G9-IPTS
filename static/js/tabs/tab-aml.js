// ============================================================
// tab-aml.js — AML Monitoring Tab
// ============================================================

let _amlAllAlerts  = [];
let _amlRiskChart  = null;

// ── Load everything ──────────────────────────────────────────
async function loadAmlMonitor() {
  await Promise.all([
    loadAmlAlerts(),
    loadAmlRules(),
    loadAmlSarTracker(),
    loadTransactions(),
  ]);
}

// ── Alerts (transactions with risk_score >= 40 or blocked/flagged) ──
async function loadAmlAlerts() {
  try {
    const [txData, caseData] = await Promise.all([
      apiFetch('/api/transactions?limit=500'),
      apiFetch('/api/compliance/cases').catch(() => ({ cases: [] }))
    ]);

    // Build case lookup by settlement_id
    const caseMap = {};
    (caseData.cases || []).forEach(c => { if (c.settlement_id) caseMap[c.settlement_id] = c; });

    // Filter to alerts: blocked, flagged, or risk >= 40
    _amlAllAlerts = (txData.transactions || [])
      .filter(t => t.status === 'blocked' || t.status === 'flagged' || (t.risk_score || 0) >= 40)
      .map(t => ({ ...t, _case: caseMap[t.id] || null }));

    // KPIs
    const blocked   = _amlAllAlerts.filter(t => t.status === 'blocked').length;
    const avgRisk   = _amlAllAlerts.length
      ? (_amlAllAlerts.reduce((s, t) => s + (t.risk_score || 0), 0) / _amlAllAlerts.length).toFixed(1)
      : '—';
    const sarCount  = Object.values(caseMap).filter(c => c.sar_number).length;

    const _set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    _set('amlKpiTotal',   _amlAllAlerts.length);
    _set('amlKpiBlocked', blocked);
    _set('amlKpiAvgRisk', avgRisk);
    _set('amlKpiSar',     sarCount);

    // Risk distribution chart
    renderAmlRiskChart(_amlAllAlerts);

    // Corridors
    renderAmlCorridors(_amlAllAlerts);

    filterAmlAlerts();
  } catch(e) {
    const tbody = document.getElementById('amlAlertBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-red-400">Error: ${e.message}</td></tr>`;
    console.error('AML alerts error:', e);
  }
}

function filterAmlAlerts() {
  const q       = (document.getElementById('amlSearch')?.value || '').toLowerCase();
  const status  = (document.getElementById('amlFilterStatus')?.value || '').toLowerCase();
  const riskLvl = (document.getElementById('amlFilterRisk')?.value || '');

  const filtered = _amlAllAlerts.filter(t => {
    const rs = t.risk_score || 0;
    if (status && (t.status||'').toLowerCase() !== status) return false;
    if (riskLvl === 'critical' && rs < 85)  return false;
    if (riskLvl === 'high'     && (rs < 70 || rs >= 85)) return false;
    if (riskLvl === 'medium'   && (rs < 40 || rs >= 70)) return false;
    if (q) {
      const hay = [t.sender, t.beneficiary_name, t.tx_hash, t.status, t.sender_username, t.receiver_username].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const countEl = document.getElementById('amlAlertCount');
  if (countEl) countEl.textContent = `${filtered.length} alert${filtered.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('amlAlertBody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">No alerts match the current filters.</td></tr>';
    return;
  }

  const statusCls = { blocked:'bg-red-100 text-red-600', flagged:'bg-orange-100 text-orange-600', approved:'bg-green-100 text-green-600', pending:'bg-yellow-100 text-yellow-700' };

  tbody.innerHTML = filtered.map(t => {
    const rs = t.risk_score || 0;
    const riskColor = rs >= 85 ? '#ef4444' : rs >= 70 ? '#f97316' : rs >= 40 ? '#eab308' : '#22c55e';
    const stc = statusCls[(t.status||'').toLowerCase()] || 'bg-gray-100 text-gray-500';
    const date = (t.created_at || '').slice(0, 16).replace('T', ' ');
    const sender = t.sender_username || t.sender || '—';
    const bene   = t.beneficiary_name || t.receiver_username || t.receiver || '—';
    const caseHtml = t._case
      ? `<button onclick="event.stopPropagation();openCaseModal('${t._case.id}')" class="px-2 py-0.5 rounded-lg text-[10px] bg-accent/10 text-accent hover:bg-accent/20 font-semibold transition">${t._case.case_number}</button>`
      : '<span class="text-gray-300 text-[10px]">—</span>';
    return `<tr class="border-b border-gray-100 hover:bg-red-50/30 transition cursor-pointer" onclick="showAmlTxDetail('${t.id}')">
      <td class="py-2 px-3 text-gray-400">${date}</td>
      <td class="py-2 px-3 text-gray-700 max-w-[110px] truncate">${sender}</td>
      <td class="py-2 px-3 text-gray-700 max-w-[110px] truncate">${bene}</td>
      <td class="py-2 px-3 text-right font-semibold text-gray-800">$${Number(t.amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td class="py-2 px-3 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <div class="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full rounded-full" style="width:${Math.min(rs,100)}%;background:${riskColor}"></div>
          </div>
          <span class="font-bold text-xs" style="color:${riskColor}">${rs.toFixed(0)}</span>
        </div>
      </td>
      <td class="py-2 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${stc}">${t.status||'—'}</span></td>
      <td class="py-2 px-3 text-center">${caseHtml}</td>
      <td class="py-2 px-3 font-mono text-gray-400 text-[10px]">${(t.tx_hash||'—').slice(0,12)}…</td>
    </tr>`;
  }).join('');
}

// ── Risk Score Distribution Chart ────────────────────────────
function renderAmlRiskChart(alerts) {
  const canvas = document.getElementById('amlRiskDistChart');
  if (!canvas) return;
  const buckets = { '40–54': 0, '55–69': 0, '70–84': 0, '85–100': 0 };
  alerts.forEach(t => {
    const rs = t.risk_score || 0;
    if (rs >= 85)      buckets['85–100']++;
    else if (rs >= 70) buckets['70–84']++;
    else if (rs >= 55) buckets['55–69']++;
    else if (rs >= 40) buckets['40–54']++;
  });
  if (_amlRiskChart) { _amlRiskChart.destroy(); _amlRiskChart = null; }
  _amlRiskChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        label: 'Transactions',
        data: Object.values(buckets),
        backgroundColor: ['#fef08a','#fdba74','#f97316','#ef4444'],
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

// ── Top Risk Corridors ────────────────────────────────────────
function renderAmlCorridors(alerts) {
  const el = document.getElementById('amlCorridors');
  if (!el) return;
  const corrMap = {};
  alerts.forEach(t => {
    const sender   = t.sender_username || t.sender || 'Unknown';
    const receiver = t.beneficiary_name || t.receiver_username || 'Unknown';
    const key = `${sender} → ${receiver}`;
    if (!corrMap[key]) corrMap[key] = { count: 0, totalRisk: 0, totalAmt: 0 };
    corrMap[key].count++;
    corrMap[key].totalRisk += (t.risk_score || 0);
    corrMap[key].totalAmt  += (t.amount || 0);
  });
  const top = Object.entries(corrMap)
    .map(([k, v]) => ({ corridor: k, count: v.count, avgRisk: (v.totalRisk/v.count).toFixed(1), totalAmt: v.totalAmt }))
    .sort((a, b) => b.avgRisk - a.avgRisk)
    .slice(0, 6);

  if (!top.length) { el.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">No corridor data.</p>'; return; }

  el.innerHTML = top.map(c => {
    const risk = parseFloat(c.avgRisk);
    const barColor = risk >= 85 ? 'bg-red-500' : risk >= 70 ? 'bg-orange-400' : 'bg-yellow-400';
    const pct = Math.min(Math.round(risk), 100);
    return `<div>
      <div class="flex justify-between text-xs mb-1">
        <span class="text-gray-700 truncate max-w-[220px] font-medium">${c.corridor}</span>
        <span class="text-gray-400 shrink-0 ml-2">${c.count} txns · avg <span class="font-bold text-gray-700">${c.avgRisk}</span></span>
      </div>
      <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div class="h-full ${barColor} rounded-full transition-all" style="width:${pct}%"></div>
      </div>
    </div>`;
  }).join('');
}

// ── AML Rule Engine ───────────────────────────────────────────
async function loadAmlRules() {
  const el = document.getElementById('amlRules');
  if (!el) return;
  // Synthetic rules — in a real system these come from a rules API
  const rules = [
    { name: 'High-Value Single Transfer', desc: 'Single transaction > $100,000', threshold: '$100K', hits: 3, status: 'active' },
    { name: 'Structuring Detection', desc: 'Multiple txns just below $10K threshold within 24h', threshold: '$10K', hits: 7, status: 'active' },
    { name: 'Rapid Fund Cycling', desc: 'Funds in and out within 2 hours', threshold: '2h window', hits: 2, status: 'active' },
    { name: 'Sanctions List Match', desc: 'Beneficiary name matches OFAC/UN sanctions list', threshold: 'Exact match', hits: 1, status: 'active' },
    { name: 'High-Risk Corridor', desc: 'Transfer to/from high-risk jurisdiction (FATF grey list)', threshold: 'Country flag', hits: 5, status: 'active' },
    { name: 'PEP Counterparty', desc: 'Counterparty identified as Politically Exposed Person', threshold: 'PEP flag', hits: 0, status: 'inactive' },
    { name: 'Shell Company Pattern', desc: 'Beneficiary registered in secrecy jurisdiction with no activity', threshold: 'Profile score', hits: 1, status: 'active' },
    { name: 'Velocity Anomaly', desc: 'Transaction frequency > 3× 30-day average', threshold: '3× baseline', hits: 4, status: 'active' },
  ];
  el.innerHTML = rules.map(r => `
    <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
      <div class="w-2 h-2 rounded-full shrink-0 ${r.status === 'active' ? 'bg-green-400' : 'bg-gray-300'}"></div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-gray-800">${r.name}</p>
        <p class="text-[10px] text-gray-500 truncate">${r.desc} · Threshold: ${r.threshold}</p>
      </div>
      <div class="text-center shrink-0">
        <p class="text-sm font-bold ${r.hits > 0 ? 'text-red-500' : 'text-gray-400'}">${r.hits}</p>
        <p class="text-[10px] text-gray-400">hits</p>
      </div>
    </div>`).join('');
}

// ── SAR Tracker ───────────────────────────────────────────────
async function loadAmlSarTracker() {
  const el = document.getElementById('amlSarTracker');
  if (!el) return;
  try {
    const data = await apiFetch('/api/compliance/cases');
    const sars = (data.cases || []).filter(c => c.sar_number);
    if (!sars.length) {
      el.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">No SARs filed yet.</p>';
      return;
    }
    const statusCls = { open:'text-red-500', investigating:'text-yellow-500', escalated:'text-orange-500', resolved:'text-green-500', closed:'text-gray-400' };
    el.innerHTML = sars.map(c => `
      <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 cursor-pointer hover:bg-accent/5 transition" onclick="switchTab('cases');setTimeout(()=>openCaseModal('${c.id}'),300)">
        <i class="fas fa-file-shield text-purple-400 text-sm shrink-0"></i>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold text-gray-800">${c.sar_number}</p>
          <p class="text-[10px] text-gray-500 truncate">${c.case_number} · ${c.beneficiary_name || '—'} · $${Number(c.amount||0).toLocaleString()}</p>
        </div>
        <span class="text-[10px] font-semibold ${statusCls[c.status]||'text-gray-400'} capitalize">${c.status}</span>
      </div>`).join('');
  } catch(e) {
    el.innerHTML = `<p class="text-xs text-red-400 text-center py-4">Error: ${e.message}</p>`;
  }
}

// ── AML Transaction Detail Pop-up ─────────────────────────────
async function showAmlTxDetail(txId) {
  const modal = document.getElementById('amlTxModal');
  const body  = document.getElementById('amlTxModalBody');
  if (!modal || !body) return;
  body.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading…</div>';
  modal.classList.remove('hidden');
  try {
    const data = await apiFetch(`/api/settlements/${txId}/detail`);
    const t = data.settlement || data;
    const rs = t.risk_score || 0;
    const riskColor = rs >= 85 ? 'text-red-500' : rs >= 70 ? 'text-orange-500' : rs >= 40 ? 'text-yellow-500' : 'text-green-500';
    const statusCls = { blocked:'bg-red-100 text-red-600', flagged:'bg-orange-100 text-orange-600', approved:'bg-green-100 text-green-600', pending:'bg-yellow-100 text-yellow-700', settled:'bg-blue-100 text-blue-600' };
    const stc = statusCls[(t.status||'').toLowerCase()] || 'bg-gray-100 text-gray-500';
    const fmt = v => v ? new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
    body.innerHTML = `
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 col-span-2">
          <p class="text-[10px] text-gray-400">Transaction ID</p>
          <p class="text-xs font-mono text-gray-700 mt-0.5 break-all">${t.id || txId}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p class="text-[10px] text-gray-400">Amount</p>
          <p class="text-xl font-bold text-gray-800 mt-0.5">$${Number(t.amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p class="text-[10px] text-gray-400">Risk Score</p>
          <p class="text-xl font-bold mt-0.5 ${riskColor}">${rs.toFixed(1)}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p class="text-[10px] text-gray-400">Sender</p>
          <p class="text-xs text-gray-700 mt-0.5">${t.sender_username || t.sender || '—'}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p class="text-[10px] text-gray-400">Receiver / Beneficiary</p>
          <p class="text-xs text-gray-700 mt-0.5">${t.beneficiary_name || t.receiver_username || t.receiver || '—'}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p class="text-[10px] text-gray-400">Status</p>
          <p class="mt-1"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${stc}">${t.status||'—'}</span></p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p class="text-[10px] text-gray-400">Corridor</p>
          <p class="text-xs text-gray-700 mt-0.5">${t.corridor || t.currency || '—'}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 col-span-2">
          <p class="text-[10px] text-gray-400">Created At</p>
          <p class="text-xs text-gray-700 mt-0.5">${fmt(t.created_at)}</p>
        </div>
        ${t.notes ? `<div class="bg-yellow-50 rounded-xl p-3 border border-yellow-100 col-span-2"><p class="text-[10px] text-yellow-600 font-semibold">Notes</p><p class="text-xs text-gray-700 mt-1">${t.notes}</p></div>` : ''}
      </div>`;
  } catch(e) {
    body.innerHTML = `<p class="text-xs text-red-400 text-center py-6">Error loading transaction: ${e.message}</p>`;
  }
}
