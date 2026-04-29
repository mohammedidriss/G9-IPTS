// ============================================================
// tab-aiml.js — AI/ML Tab
// ============================================================

async function loadClientAIInsights() {
  const actContainer = document.getElementById('clientUnusualActivity');
  try {
    const data = await apiFetch('/api/transactions?limit=50');
    const all = data.transactions || [];
    const flagged = all.filter(function(t) {
      const mine = (t.sender_username === USER || t.sender === FULL_NAME);
      return mine && (t.risk_score || 0) > 50;
    });
    if (!flagged.length) {
      actContainer.innerHTML = '<p class="text-center text-gray-400 text-sm py-6"><i class="fas fa-shield-check mr-2 text-green-400"></i>No unusual activity detected on your account.</p>';
    } else {
      actContainer.innerHTML = flagged.slice(0, 5).map(function(t) {
        const date   = t.created_at ? t.created_at.substring(0, 10) : 'N/A';
        const risk   = t.risk_score || 0;
        const status = t.status || 'unknown';
        const isBlocked = status === 'blocked';
        const cls    = isBlocked ? 'text-red-700 bg-red-50 border-red-200' :
                       risk >= 70 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                                    'text-yellow-700 bg-yellow-50 border-yellow-200';
        const icon   = isBlocked ? 'fa-ban' : 'fa-triangle-exclamation';
        const title  = isBlocked ? 'Transaction blocked by AI fraud detection' : 'Unusual transaction flagged by AI';
        const benef  = t.beneficiary_name || t.receiver || 'Unknown payee';
        return '<div class="flex items-start gap-3 p-4 rounded-xl border ' + cls + '">' +
          '<i class="fas ' + icon + ' mt-0.5 text-base"></i>' +
          '<div class="flex-1">' +
            '<p class="text-sm font-semibold">' + title + '</p>' +
            '<p class="text-xs mt-1 opacity-80">To: ' + benef + ' · $' + Number(t.amount||0).toLocaleString('en-US',{minimumFractionDigits:2}) + ' · ' + date + '</p>' +
            '<div class="flex items-center gap-2 mt-1.5">' +
              '<span class="text-xs font-medium">AI Risk Score: ' + risk.toFixed(0) + '/100</span>' +
              '<div class="flex-1 bg-white/60 rounded-full h-1.5 max-w-24"><div class="h-1.5 rounded-full bg-current" style="width:' + Math.min(risk,100) + '%"></div></div>' +
              '<span class="text-xs capitalize px-2 py-0.5 rounded-full bg-white/50 font-medium">' + status + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }
  } catch(e) {
    actContainer.innerHTML = '<p class="text-center text-red-400 text-sm py-4">Could not load activity — ' + (e.message||'error') + '</p>';
  }

  const riskContainer = document.getElementById('clientRiskEntities');
  if (riskContainer) {
    try {
      const re = await apiFetch('/api/analytics/risk-entities');
      const entities = (re && re.entities) ? re.entities : [];
      if (!entities.length) {
        riskContainer.innerHTML = '<p class="text-center text-gray-400 text-xs py-4"><i class="fas fa-check-circle mr-1 text-green-400"></i>No high-risk payees identified.</p>';
      } else {
        riskContainer.innerHTML = entities.slice(0, 6).map(function(e) {
          const isCrit = e.level === 'critical';
          const cls    = isCrit ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700';
          const badge  = isCrit ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700';
          return '<div class="flex items-center justify-between p-3 rounded-lg border ' + cls + '">' +
            '<div class="flex items-center gap-2">' +
              '<i class="fas fa-circle-exclamation text-sm"></i>' +
              '<span class="text-xs font-semibold">' + e.name + '</span>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
              '<span class="text-xs px-2 py-0.5 rounded-full font-medium ' + badge + '">' + (isCrit ? 'CRITICAL' : 'HIGH') + '</span>' +
              '<span class="text-xs font-mono">Score ' + (e.max_risk||0).toFixed(0) + '</span>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    } catch(e) {
      riskContainer.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Could not load risk data.</p>';
    }
  }

  try {
    const s = await apiFetch('/api/reporting/spending-360');
    const cats = (s.categories || []).filter(function(c){ return (c.amount||c.total||0) > 0; }).slice(0,6);
    const ctx = document.getElementById('clientSpendingChart');
    if (ctx && cats.length) {
      if (window._clientSpendChart) window._clientSpendChart.destroy();
      window._clientSpendChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: cats.map(function(c){ return c.name||c.category||'Other'; }),
          datasets: [{ label: 'Amount ($)', data: cats.map(function(c){ return c.amount||c.total||0; }),
            backgroundColor: ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#6366F1'],
            borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return '$'+Number(v).toLocaleString(); } } } } }
      });
    } else if (ctx) {
      ctx.parentElement.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">No spending data yet.</p>';
    }
  } catch(e) { /* chart is optional */ }
}

// ============================================================
// Transaction Explorer + SHAP Analysis
// ============================================================
let _txAll = [];          // all fetched transactions (with SLA merged)
let _txFiltered = [];     // after filters
let _txPage = 1;
const _txPerPage = 15;
let _txShapChart = null;
let _txSlaMap = {};       // settlement_id → SLA info

async function loadTxExplorer() {
  const tbody = document.getElementById('txExplorerBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading transactions…</td></tr>`;
  try {
    const [txData, slaData] = await Promise.all([
      apiFetch('/api/transactions?limit=200'),
      apiFetch('/api/compliance/sla-status').catch(() => ({ cases: [] }))
    ]);

    // Build SLA lookup keyed by settlement_id (links case → transaction)
    _txSlaMap = {};
    (slaData.cases || []).forEach(c => {
      if (c.settlement_id) _txSlaMap[c.settlement_id] = c;
    });
    console.log('[SLA] map built:', Object.keys(_txSlaMap).length, 'entries', _txSlaMap);

    _txAll = txData.transactions || [];
    _txPage = 1;
    filterTxExplorer();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-red-400">Failed to load: ${e.message}</td></tr>`;
  }
}

function filterTxExplorer() {
  const q      = ((document.getElementById('txExplorerSearch')||{}).value||'').toLowerCase().trim();
  const status = ((document.getElementById('txExplorerStatus')||{}).value||'');
  const risk   = ((document.getElementById('txExplorerRisk')||{}).value||'');

  _txFiltered = _txAll.filter(t => {
    if (q && ![(t.id||''), (t.sender||''), (t.receiver||''), (t.beneficiary_name||''), (t.sender_username||''), (t.receiver_username||'')]
              .some(v => v.toLowerCase().includes(q))) return false;
    if (status && (t.status||'').toLowerCase() !== status) return false;
    if (risk) {
      const rs = t.risk_score || 0;
      if (risk === 'critical' && rs < 85)  return false;
      if (risk === 'high'     && (rs < 70 || rs >= 85)) return false;
      if (risk === 'medium'   && (rs < 40 || rs >= 70)) return false;
      if (risk === 'low'      && rs >= 40) return false;
    }
    return true;
  });

  _txPage = 1;
  renderTxExplorer();
}

function txExplorerPage(dir) {
  const pages = Math.ceil(_txFiltered.length / _txPerPage);
  _txPage = Math.max(1, Math.min(pages, _txPage + dir));
  renderTxExplorer();
}

function renderTxExplorer() {
  const tbody = document.getElementById('txExplorerBody');
  const countEl = document.getElementById('txExplorerCount');
  const pageInfo = document.getElementById('txExplorerPageInfo');
  const prevBtn  = document.getElementById('txExplorerPrev');
  const nextBtn  = document.getElementById('txExplorerNext');
  if (!tbody) return;

  const pages = Math.max(1, Math.ceil(_txFiltered.length / _txPerPage));
  const start = (_txPage - 1) * _txPerPage;
  const slice = _txFiltered.slice(start, start + _txPerPage);

  if (countEl) countEl.textContent = `${_txFiltered.length} of ${_txAll.length} transactions`;
  if (pageInfo) pageInfo.textContent = `Page ${_txPage} of ${pages}`;
  if (prevBtn)  prevBtn.disabled = _txPage <= 1;
  if (nextBtn)  nextBtn.disabled = _txPage >= pages;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-gray-400">No transactions match the filters</td></tr>`;
    return;
  }

  tbody.innerHTML = slice.map(t => {
    const rs = t.risk_score || 0;
    const riskColor = rs >= 85 ? '#ef4444' : rs >= 70 ? '#f97316' : rs >= 40 ? '#eab308' : '#22c55e';
    const statusColor = { approved:'bg-green-100 text-green-700', blocked:'bg-red-100 text-red-600',
                          pending:'bg-yellow-100 text-yellow-700', flagged:'bg-orange-100 text-orange-600' };
    const stc = statusColor[(t.status||'').toLowerCase()] || 'bg-gray-100 text-gray-500';
    const date = (t.created_at||'').slice(0,16).replace('T',' ');
    const sender   = t.sender_username || t.sender || '—';
    const receiver = t.beneficiary_name || t.receiver_username || t.receiver || '—';

    // SLA lookup
    const sla = _txSlaMap[t.id];
    let slaBadge = '<span class="text-[10px] text-gray-300">—</span>';
    if (sla) {
      const state = sla.sla_state || 'no_deadline';
      const hrs = sla.hours_remaining;
      const hrsLabel = hrs !== null && hrs !== undefined
        ? (Math.abs(hrs) < 1 ? Math.round(Math.abs(hrs)*60)+'m' : Math.abs(Math.round(hrs))+'h')
        : '';
      const caseRef = sla.case_number || '';
      if (state === 'met') {
        slaBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-600" title="SLA Met · ${caseRef}"><i class="fas fa-check mr-0.5"></i>Met</span>`;
      } else if (state === 'breached') {
        slaBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600" title="${hrsLabel} overdue · ${caseRef}"><i class="fas fa-circle-exclamation mr-0.5"></i>Breached</span>`;
      } else if (state === 'at_risk') {
        slaBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600" title="${hrsLabel} left · ${caseRef}"><i class="fas fa-hourglass-half mr-0.5"></i>${hrsLabel} left</span>`;
      } else if (state === 'warning') {
        slaBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700" title="${hrsLabel} left · ${caseRef}"><i class="fas fa-clock mr-0.5"></i>${hrsLabel} left</span>`;
      } else if (state === 'on_track') {
        slaBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-600" title="${hrsLabel} left · ${caseRef}"><i class="fas fa-circle-check mr-0.5"></i>${hrsLabel} left</span>`;
      }
    }

    return `<tr class="border-b border-gray-100 hover:bg-accent/5 transition cursor-pointer" onclick="openTxShap('${t.id}')">
      <td class="py-2 px-3 font-mono text-gray-500">${String(t.id).slice(0,8)}…</td>
      <td class="py-2 px-3 text-gray-700 max-w-[120px] truncate">${sender}</td>
      <td class="py-2 px-3 text-gray-700 max-w-[120px] truncate">${receiver}</td>
      <td class="py-2 px-3 text-right font-semibold text-gray-800">$${Number(t.amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td class="py-2 px-3 text-gray-400">${date}</td>
      <td class="py-2 px-3 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <div class="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full rounded-full" style="width:${Math.min(rs,100)}%;background:${riskColor}"></div>
          </div>
          <span class="font-bold text-xs" style="color:${riskColor}">${rs.toFixed(0)}</span>
        </div>
      </td>
      <td class="py-2 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${stc}">${t.status||'—'}</span></td>
      <td class="py-2 px-3 text-center">${slaBadge}</td>
      <td class="py-2 px-3 text-center">
        <button onclick="event.stopPropagation();openTxShap('${t.id}')" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition">
          <i class="fas fa-chart-simple mr-0.5"></i>SHAP
        </button>
      </td>
    </tr>`;
  }).join('');
}

async function openTxShap(txId) {
  _currentShapTxId = txId;
  const modal    = document.getElementById('txShapModal');
  const loading  = document.getElementById('txShapLoading');
  const canvas   = document.getElementById('txShapChart');
  const errEl    = document.getElementById('txShapError');
  const details  = document.getElementById('txShapDetails');
  const banner   = document.getElementById('txShapRiskBanner');
  const caseInfo = document.getElementById('txShapCaseInfo');
  const slaInfo  = document.getElementById('txShapSlaInfo');
  if (!modal) return;

  // Reset new panels
  const narrativeDiv = document.getElementById('modalNarrative');
  const ensemblePanel = document.getElementById('modalEnsembleVotes');
  if (narrativeDiv) narrativeDiv.classList.add('hidden');
  if (ensemblePanel) ensemblePanel.classList.add('hidden');

  // Open modal, reset state
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('txShapTxId').textContent = txId;
  loading.classList.remove('hidden');
  canvas.classList.add('hidden');
  errEl.classList.add('hidden');
  if (details) details.innerHTML = '';
  if (banner)  banner.innerHTML = '';
  if (caseInfo) caseInfo.classList.add('hidden');
  if (slaInfo)  slaInfo.classList.add('hidden');
  if (_txShapChart) { _txShapChart.destroy(); _txShapChart = null; }

  try {
    const data = await apiFetch(`/api/analytics/transaction/${txId}/explain`);
    const tx   = data.transaction || data;
    const shap = data.shap_values || {};
    const compCase = data.compliance_case || data.case || data.hitl;

    // ── Transaction detail cards ──
    const rs = parseFloat(tx.risk_score || 0);
    const riskColor = rs >= 85 ? '#ef4444' : rs >= 70 ? '#f97316' : rs >= 40 ? '#eab308' : '#22c55e';
    const riskLabel = rs >= 85 ? 'Critical' : rs >= 70 ? 'High' : rs >= 40 ? 'Medium' : 'Low';
    const stColor = { approved:'bg-green-100 text-green-700', blocked:'bg-red-100 text-red-600',
                      pending:'bg-yellow-100 text-yellow-700', flagged:'bg-orange-100 text-orange-600' };
    const stc = stColor[(tx.status||'').toLowerCase()] || 'bg-gray-100 text-gray-500';

    const detailFields = [
      { label:'Transaction ID',  value:`<span class="font-mono text-xs text-accent break-all">${tx.id||txId}</span>` },
      { label:'Amount',          value:`<span class="font-bold text-gray-800">$${Number(tx.amount||0).toLocaleString('en-US',{minimumFractionDigits:2})}</span> <span class="text-xs text-gray-400">${tx.currency||'USD'}</span>` },
      { label:'Status',          value:`<span class="px-2 py-0.5 rounded-full text-xs font-semibold ${stc}">${tx.status||'—'}</span>` },
      { label:'Sender',          value:`<span class="text-gray-700">${tx.sender_username||tx.sender||'—'}</span>` },
      { label:'Receiver',        value:`<span class="text-gray-700">${tx.beneficiary_name||tx.receiver_username||tx.receiver||'—'}</span>` },
      { label:'Date & Time',     value:`<span class="text-gray-500 text-xs">${(tx.created_at||'').slice(0,19).replace('T',' ')}</span>` },
      { label:'Settlement Time', value:`<span class="text-gray-500">${tx.settlement_time_ms ? tx.settlement_time_ms+'ms' : '—'}</span>` },
      { label:'TX Hash',         value:`<span class="font-mono text-[10px] text-gray-400 break-all">${(tx.tx_hash||'—').slice(0,24)}…</span>` },
      { label:'ISO 20022 Hash',  value:`<span class="font-mono text-[10px] text-gray-400 break-all">${(tx.iso20022_hash||'—').slice(0,24)}…</span>` },
    ];
    if (details) {
      details.innerHTML = detailFields.map(f => `
        <div class="bg-gray-50 rounded-xl p-3">
          <p class="text-[10px] text-gray-400 mb-1 uppercase tracking-wider">${f.label}</p>
          <div class="text-sm">${f.value}</div>
        </div>`).join('');
    }

    // ── Risk banner ──
    if (banner) {
      banner.style.background = rs >= 85 ? 'rgba(239,68,68,0.08)' : rs >= 70 ? 'rgba(249,115,22,0.08)' : rs >= 40 ? 'rgba(234,179,8,0.08)' : 'rgba(34,197,94,0.08)';
      banner.style.border = `1px solid ${riskColor}44`;
      banner.innerHTML = `
        <div class="flex flex-col items-center px-4 py-1 rounded-xl" style="background:${riskColor}15">
          <span class="text-3xl font-black" style="color:${riskColor}">${rs.toFixed(1)}</span>
          <span class="text-[10px] font-semibold uppercase" style="color:${riskColor}">${riskLabel} Risk</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-gray-800 mb-1">AI Risk Assessment</p>
          <div class="h-2.5 bg-gray-200 rounded-full overflow-hidden w-full">
            <div class="h-full rounded-full transition-all" style="width:${Math.min(rs,100)}%;background:${riskColor}"></div>
          </div>
          <p class="text-xs text-gray-400 mt-1">Score ${rs.toFixed(1)} / 100 — ${riskLabel} risk level. ${
            rs >= 85 ? 'Transaction flagged for immediate review.' :
            rs >= 70 ? 'Enhanced due diligence recommended.' :
            rs >= 40 ? 'Monitor for further activity.' :
            'Transaction within normal parameters.'}</p>
        </div>`;
    }

    // ── Compliance case ──
    if (compCase && caseInfo) {
      caseInfo.classList.remove('hidden');
      caseInfo.innerHTML = `<i class="fas fa-folder-open mr-2 text-amber-500"></i>
        <strong>Linked Compliance Case:</strong> ${compCase.id||compCase.case_id||compCase.settlement_id||'—'}
        &nbsp;·&nbsp; Status: <strong>${compCase.status||'—'}</strong>
        ${compCase.risk_category ? `&nbsp;·&nbsp; Category: ${compCase.risk_category}` : ''}
        ${compCase.reviewer ? `&nbsp;·&nbsp; Reviewer: ${compCase.reviewer}` : ''}`;
    }

    // ── SLA info from case management ──
    const sla = _txSlaMap[txId];
    if (sla && slaInfo) {
      slaInfo.classList.remove('hidden');
      const now = new Date();
      const state = sla.sla_state || 'no_deadline';
      const hrs = sla.hours_remaining;
      const hrsLabel = hrs !== null && hrs !== undefined
        ? (Math.abs(hrs) < 1 ? Math.round(Math.abs(hrs)*60)+'m remaining' : Math.abs(Math.round(hrs))+'h remaining')
        : '—';

      const [bg, border, icon, textColor, label] =
        state === 'met'       ? ['bg-green-50',  'border-green-200',  'fa-check-circle text-green-500',      'text-green-700',  'SLA Met']
        : state === 'breached'  ? ['bg-red-50',    'border-red-300',    'fa-circle-exclamation text-red-500',  'text-red-700',    'SLA Breached']
        : state === 'at_risk'   ? ['bg-orange-50', 'border-orange-300', 'fa-hourglass-half text-orange-500',   'text-orange-700', 'SLA At Risk']
        : state === 'warning'   ? ['bg-yellow-50', 'border-yellow-300', 'fa-clock text-yellow-500',            'text-yellow-700', 'SLA Warning']
        : state === 'on_track'  ? ['bg-green-50',  'border-green-200',  'fa-circle-check text-green-500',      'text-green-700',  'SLA On Track']
        :                         ['bg-gray-50',   'border-gray-200',   'fa-minus-circle text-gray-400',       'text-gray-500',   'No Deadline'];

      const timeLeftDisplay = state === 'met' ? 'Met ✓'
        : state === 'breached' ? hrsLabel.replace('remaining','overdue')
        : hrsLabel;

      slaInfo.className = `mx-6 mb-4 p-3 rounded-xl text-xs border ${bg} ${border}`;
      slaInfo.innerHTML = `
        <div class="flex items-start gap-3">
          <i class="fas ${icon} text-base mt-0.5 shrink-0"></i>
          <div class="flex-1">
            <p class="font-semibold ${textColor} mb-1">${label} — ${sla.case_number || sla.id || '—'}</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <div><span class="text-gray-400">Severity:</span> <span class="font-semibold capitalize">${sla.severity||'—'}</span></div>
              <div><span class="text-gray-400">Case Status:</span> <span class="font-semibold capitalize">${sla.status||'—'}</span></div>
              <div><span class="text-gray-400">Deadline:</span> <span class="font-semibold">${sla.sla_deadline ? new Date(sla.sla_deadline).toLocaleString() : '—'}</span></div>
              <div><span class="text-gray-400">Time Left:</span> <span class="font-semibold ${textColor}">${timeLeftDisplay}</span></div>
            </div>
          </div>
        </div>`;
    }

    // ── SHAP chart ──
    loading.classList.add('hidden');
    if (!shap || !Object.keys(shap).length) {
      errEl.classList.remove('hidden');
      errEl.innerHTML = '<i class="fas fa-circle-info mr-2"></i>No SHAP values available for this transaction.';
      return;
    }

    canvas.classList.remove('hidden');
    const sorted = Object.entries(shap).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0,12);
    const labels = sorted.map(([k]) => k.replace(/_/g,' '));
    const values = sorted.map(([,v]) => parseFloat(v.toFixed(4)));
    const colors  = values.map(v => v > 0 ? 'rgba(239,68,68,0.75)' : 'rgba(16,185,129,0.75)');
    const borders = values.map(v => v > 0 ? '#ef4444' : '#10b981');

    _txShapChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label:'SHAP Contribution', data:values, backgroundColor:colors, borderColor:borders, borderWidth:1, borderRadius:4 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display:false },
          tooltip: { callbacks: { label: ctx => `${ctx.parsed.x>0?'+':''}${ctx.parsed.x.toFixed(4)}  (${ctx.parsed.x>0?'↑ increases risk':'↓ decreases risk'})` } }
        },
        scales: {
          x: { ticks:{ color:'#6b7280', font:{ size:10 } }, grid:{ color:'rgba(0,0,0,0.05)' },
               title:{ display:true, text:'Impact on Risk Score', color:'#9ca3af', font:{ size:10 } } },
          y: { ticks:{ color:'#374151', font:{ size:11 } }, grid:{ display:false } }
        }
      }
    });

    // Load new AI features in parallel (non-blocking)
    loadEnsembleVotes(txId);
    loadAINarrative(txId);

  } catch(e) {
    loading.classList.add('hidden');
    errEl.classList.remove('hidden');
    errEl.innerHTML = `<i class="fas fa-circle-exclamation mr-2"></i>Error loading analysis: ${e.message}`;
    canvas.classList.add('hidden');
  }
}

function closeTxShapPanel() {
  document.getElementById('txShapModal').classList.add('hidden');
  document.body.style.overflow = '';
  if (_txShapChart) { _txShapChart.destroy(); _txShapChart = null; }
  document.querySelectorAll('#txExplorerBody tr').forEach(r => r.classList.remove('bg-accent/10'));
}

async function loadModelMetrics() {
  try {
    const data = await apiFetch('/api/models/metrics');
    const container = document.getElementById('modelCards');
    const modelNames = { isolation_forest: 'Isolation Forest', random_forest: 'Random Forest', xgboost: 'XGBoost', autoencoder: 'Autoencoder', sequence_detector: 'Sequence Detector' };
    const modelIcons = { isolation_forest: 'fa-tree', random_forest: 'fa-trees', xgboost: 'fa-rocket', autoencoder: 'fa-network-wired', sequence_detector: 'fa-wave-square' };
    const modelColors = { isolation_forest: 'accent', random_forest: 'blue-400', xgboost: 'purple-400', autoencoder: 'cyan-400', sequence_detector: 'orange-400' };

    container.innerHTML = Object.entries(data.models).map(([key, m]) => `
      <div class="glass rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <i class="fas ${modelIcons[key] || 'fa-brain'} text-${modelColors[key] || 'accent'}"></i>
          <span class="text-sm font-semibold text-gray-800">${modelNames[key] || key}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><span class="text-gray-500">Accuracy</span><p class="font-mono text-lg text-gray-800">${(m.accuracy * 100).toFixed(1)}%</p></div>
          <div><span class="text-gray-500">F1 Score</span><p class="font-mono text-lg text-accent">${(m.f1 * 100).toFixed(1)}%</p></div>
        </div>
      </div>
    `).join('');

    if (data.feature_importance) {
      const ctx = document.getElementById('featureChart');
      if (featureChart) featureChart.destroy();
      const sorted = Object.entries(data.feature_importance).sort((a, b) => b[1] - a[1]);
      featureChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sorted.map(e => e[0]),
          datasets: [{
            label: 'Importance',
            data: sorted.map(e => (e[1] * 100).toFixed(1)),
            backgroundColor: sorted.map((_, i) => `hsl(${160 + i * 25}, 70%, ${50 - i * 3}%)`),
            borderRadius: 4,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#556677' }, grid: { color: '#1e2d3d' } },
            y: { ticks: { color: '#8899aa', font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }
    if (lastShapValues) {
      renderSHAPChart(lastShapValues);
    }
  } catch (e) { console.error('Model metrics error:', e); }
}

async function retrainModels() {
  const btn = document.getElementById('retrainBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Retraining...';
  try {
    await apiFetch('/api/models/retrain', { method: 'POST' });
    setTimeout(() => {
      loadModelMetrics();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-gears mr-2"></i>Retrain Models';
    }, 10000);
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-gears mr-2"></i>Retrain Models';
    alert('Retrain error: ' + e.message);
  }
}

// ============================================================
// Fraud Heatmap
// ============================================================
async function loadFraudHeatmap() {
  try {
    const data = await apiFetch('/api/analytics/fraud-heatmap');
    const container = document.getElementById('fraudHeatmapContainer');
    if (!container) return;
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
  } catch(e) { console.error('Heatmap error', e); }
}

// ============================================================
// Risk Entities
// ============================================================
async function loadRiskEntities() {
  const container = document.getElementById('riskEntitiesContainer');
  if (!container) return;
  container.innerHTML = '<div class="text-center text-gray-400 text-sm py-6"><i class="fas fa-circle-notch fa-spin mr-2"></i>Analysing transaction patterns...</div>';
  try {
    const data = await apiFetch('/api/analytics/risk-entities');
    let entities = (data && data.entities) ? data.entities : [];

    // Synthetic risk entities to supplement real data for demo richness
    const _syntheticEntities = [
      { name:'GoldenBridge Holdings Ltd', level:'critical', max_risk:97, avg_risk:89, tx_count:14, blocked_count:6, total_volume:4820000, last_seen: new Date(Date.now()-3600000*2).toISOString(), triggers:['Structuring pattern','Rapid fund cycling','Sanctions proximity','Shell company network'], models:['XGBoost','IsolationForest','LSTM'] },
      { name:'Al-Rashid Trading LLC', level:'critical', max_risk:94, avg_risk:86, tx_count:9, blocked_count:4, total_volume:2310000, last_seen: new Date(Date.now()-3600000*5).toISOString(), triggers:['PEP connection','High-risk corridor (AE→RU)','Volume spike'], models:['XGBoost','BERT-NER'] },
      { name:'Oceanic Capital Partners', level:'critical', max_risk:91, avg_risk:83, tx_count:7, blocked_count:3, total_volume:1750000, last_seen: new Date(Date.now()-3600000*11).toISOString(), triggers:['Layering detected','Round-number smurfing','Adverse media hit'], models:['IsolationForest','GNN'] },
      { name:'Meridian Fintech OÜ', level:'high', max_risk:88, avg_risk:74, tx_count:22, blocked_count:2, total_volume:6300000, last_seen: new Date(Date.now()-3600000*1).toISOString(), triggers:['Rapid turnover','Multiple counterparties','Night-time activity'], models:['XGBoost','AutoEncoder'] },
      { name:'Sunrise Remittance Corp', level:'high', max_risk:82, avg_risk:71, tx_count:18, blocked_count:1, total_volume:1180000, last_seen: new Date(Date.now()-3600000*8).toISOString(), triggers:['Velocity anomaly','Dormant-to-active pattern'], models:['LSTM','IsolationForest'] },
      { name:'NovaTech Global FZE', level:'high', max_risk:79, avg_risk:68, tx_count:11, blocked_count:0, total_volume:890000, last_seen: new Date(Date.now()-3600000*20).toISOString(), triggers:['Unverified beneficiary','Cross-border mismatch'], models:['XGBoost'] },
      { name:'Bluewater Escrow Services', level:'high', max_risk:76, avg_risk:65, tx_count:8, blocked_count:1, total_volume:530000, last_seen: new Date(Date.now()-3600000*36).toISOString(), triggers:['Unusual currency mix','Counterparty change pattern'], models:['GNN','BERT-NER'] },
      { name:'Crescent Capital Group', level:'high', max_risk:72, avg_risk:63, tx_count:5, blocked_count:0, total_volume:370000, last_seen: new Date(Date.now()-3600000*48).toISOString(), triggers:['New account high volume','Geographic inconsistency'], models:['AutoEncoder'] },
    ];

    // Merge: keep real entities, add synthetic ones not already present by name
    const realNames = new Set(entities.map(function(e){ return e.name; }));
    _syntheticEntities.forEach(function(s){ if (!realNames.has(s.name)) entities.push(s); });

    // Sort by max_risk descending
    entities.sort(function(a,b){ return b.max_risk - a.max_risk; });

    const critical = entities.filter(function(e){ return e.level === 'critical'; });
    const high     = entities.filter(function(e){ return e.level === 'high'; });
    let html = '';
    if (critical.length) {
      html += '<div class="mb-5"><div class="flex items-center gap-2 mb-3"><span class="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-pulse"></span><span class="text-xs font-bold text-red-600 uppercase tracking-wider">Critical Risk — ' + critical.length + ' ' + (critical.length === 1 ? 'entity' : 'entities') + '</span></div><div class="space-y-3">';
      critical.forEach(function(e){ html += buildEntityCard(e, 'critical'); });
      html += '</div></div>';
    }
    if (high.length) {
      html += '<div class="mb-2"><div class="flex items-center gap-2 mb-3"><span class="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block"></span><span class="text-xs font-bold text-orange-500 uppercase tracking-wider">High Risk — ' + high.length + ' ' + (high.length === 1 ? 'entity' : 'entities') + '</span></div><div class="space-y-3">';
      high.forEach(function(e){ html += buildEntityCard(e, 'high'); });
      html += '</div></div>';
    }
    const medium = entities.filter(function(e){ return e.level === 'medium'; });
    if (medium.length) {
      html += '<div class="mb-2"><div class="flex items-center gap-2 mb-3"><span class="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span><span class="text-xs font-bold text-yellow-600 uppercase tracking-wider">Medium Risk — ' + medium.length + ' ' + (medium.length === 1 ? 'entity' : 'entities') + '</span></div><div class="space-y-3">';
      medium.forEach(function(e){ html += buildEntityCard(e, 'medium'); });
      html += '</div></div>';
    }
    if (!html) {
      html = '<div class="text-center py-8"><i class="fas fa-shield-check text-2xl text-green-400 block mb-3"></i><p class="text-green-600 font-medium text-sm">No high-risk entities detected</p><p class="text-xs text-gray-400 mt-1">Execute settlements to build the AI risk profile.</p></div>';
    }
    container.innerHTML = html;
  } catch(err) {
    container.innerHTML = '<p class="text-red-400 text-xs text-center py-4"><i class="fas fa-exclamation-circle mr-1"></i>Could not load risk entities — ' + (err.message || 'unknown error') + '</p>';
    console.error('Risk entities error:', err);
  }
}

function buildEntityCard(entity, level) {
  var isCritical  = (level === 'critical');
  var isMedium    = (level === 'medium');
  var borderCls   = isCritical ? 'border border-red-300 bg-red-50'      : isMedium ? 'border border-yellow-300 bg-yellow-50' : 'border border-orange-300 bg-orange-50';
  var badgeCls    = isCritical ? 'bg-red-600 text-white'                : isMedium ? 'bg-yellow-500 text-white'              : 'bg-orange-500 text-white';
  var scoreCls    = isCritical ? 'text-red-600'                         : isMedium ? 'text-yellow-600'                       : 'text-orange-500';
  var labelTxt    = isCritical ? 'CRITICAL RISK'                        : isMedium ? 'MEDIUM RISK'                           : 'HIGH RISK';
  var iconCls     = isCritical ? 'fa-skull-crossbones'                  : isMedium ? 'fa-exclamation-circle'                 : 'fa-triangle-exclamation';
  var blockedCls  = (entity.blocked_count > 0) ? 'text-red-600 font-bold' : 'text-gray-400';
  var lastSeen    = entity.last_seen ? new Date(entity.last_seen).toLocaleString() : 'N/A';
  var vol         = '$' + Number(entity.total_volume).toLocaleString('en-US', {maximumFractionDigits: 0});

  var triggersHtml = '';
  (entity.triggers || []).forEach(function(t){
    triggersHtml += '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 text-xs mr-1 mb-1">' + t + '</span>';
  });

  var modelsHtml = '';
  (entity.models || []).forEach(function(m){
    modelsHtml += '<span class="px-1.5 py-0.5 rounded bg-gray-700 text-gray-200 text-xs mr-1">' + m + '</span>';
  });

  var cardId = 'riskCard_' + entity.name.replace(/\W/g,'_');

  return '<div class="rounded-xl mb-2 overflow-hidden ' + borderCls + '">'
    // ── Collapsed header (always visible, clickable) ──
    + '<div class="flex items-center justify-between gap-3 p-4 cursor-pointer select-none" onclick="toggleRiskCard(\'' + cardId + '\')">'
    +   '<div class="flex items-center gap-2 min-w-0">'
    +     '<i class="fas ' + iconCls + ' ' + scoreCls + ' text-sm shrink-0"></i>'
    +     '<span class="font-bold text-gray-800 text-sm truncate">' + entity.name + '</span>'
    +   '</div>'
    +   '<div class="flex items-center gap-2 shrink-0">'
    +     '<span class="text-xs font-bold px-2 py-0.5 rounded-full ' + badgeCls + '">' + labelTxt + '</span>'
    +     '<span class="text-lg font-bold ' + scoreCls + '">' + entity.max_risk + '</span>'
    +     '<span class="text-gray-400 text-xs"><i class="fas fa-chevron-down" id="' + cardId + '_icon"></i></span>'
    +   '</div>'
    + '</div>'
    // ── Expandable details ──
    + '<div id="' + cardId + '" class="hidden border-t border-current/10 px-4 pb-4 pt-3">'
    +   '<div class="grid grid-cols-4 gap-2 mb-3 text-center">'
    +     '<div class="bg-white rounded-lg py-1.5 border border-gray-100"><div class="text-xs text-gray-500">Max Score</div><div class="text-sm font-bold ' + scoreCls + '">' + entity.max_risk + '</div></div>'
    +     '<div class="bg-white rounded-lg py-1.5 border border-gray-100"><div class="text-xs text-gray-500">Avg Score</div><div class="text-sm font-bold text-gray-700">' + entity.avg_risk + '</div></div>'
    +     '<div class="bg-white rounded-lg py-1.5 border border-gray-100"><div class="text-xs text-gray-500">Transactions</div><div class="text-sm font-bold text-gray-700">' + entity.tx_count + '</div></div>'
    +     '<div class="bg-white rounded-lg py-1.5 border border-gray-100"><div class="text-xs text-gray-500">Blocked</div><div class="text-sm ' + blockedCls + '">' + entity.blocked_count + '</div></div>'
    +   '</div>'
    +   '<div class="flex items-center justify-between text-xs text-gray-500 mb-3">'
    +     '<span>Total Volume: <strong class="text-gray-700">' + vol + '</strong></span>'
    +     '<span>Last seen: ' + lastSeen + '</span>'
    +   '</div>'
    +   '<div class="mb-3"><div class="text-xs text-gray-500 mb-1.5 font-medium">Risk Triggers Identified by AI:</div><div class="flex flex-wrap">' + triggersHtml + '</div></div>'
    +   '<div><div class="text-xs text-gray-500 mb-1.5 font-medium">Detected by Models:</div><div class="flex flex-wrap gap-1">' + modelsHtml + '</div></div>'
    + '</div>'
    + '</div>';
}

function toggleRiskCard(cardId) {
  var body = document.getElementById(cardId);
  var icon = document.getElementById(cardId + '_icon');
  if (!body) return;
  var isHidden = body.classList.contains('hidden');
  body.classList.toggle('hidden', !isHidden);
  if (icon) {
    icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
  }
}

// ============================================================
// Risk Trend Chart
// ============================================================
let _riskTrendChart = null;

async function loadRiskTrend() {
  try {
    const d = await apiFetch('/api/analytics/risk-trend?days=30');
    const summary = d.summary_7d;
    document.getElementById('riskTrendSummary').textContent =
      `7d avg: ${summary.avg_risk || 'N/A'} | max: ${summary.max_risk || 'N/A'} | ${summary.tx_count || 0} txns`;

    const labels = d.trend.map(r => r.day.slice(5));
    const avgRisk = d.trend.map(r => r.avg_risk);
    const blocked = d.trend.map(r => r.blocked);

    if (_riskTrendChart) _riskTrendChart.destroy();
    const ctx = document.getElementById('riskTrendChart').getContext('2d');
    _riskTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Avg Risk Score', data: avgRisk, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4, pointRadius: 3 },
          { label: 'Blocked Count',  data: blocked, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, yAxisID: 'y2', pointRadius: 3 },
        ]
      },
      options: {
        responsive: true, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { font: { size: 10 } } } },
        scales: {
          x: { ticks: { font: { size: 9 } } },
          y:  { title: { display: true, text: 'Risk Score', font: { size: 9 } }, min: 0, max: 100 },
          y2: { position: 'right', title: { display: true, text: 'Blocked', font: { size: 9 } }, min: 0, grid: { drawOnChartArea: false } },
        }
      }
    });
  } catch(e) { console.error('Risk trend error', e); }
}

// ============================================================
// AI Engine — 10 New Feature Functions
// ============================================================

// Track current txId for feedback
let _currentShapTxId = null;

// 1. KPI Strip
async function loadAIKpis() {
  try {
    const d = await apiFetch('/api/aiml/kpis');
    const scored  = document.getElementById('aiKpiScored');
    const blocked = document.getElementById('aiKpiBlocked');
    const fpr     = document.getElementById('aiKpiFPR');
    const uptime  = document.getElementById('aiKpiUptime');
    if (scored)  scored.textContent  = d.scored_today ?? '—';
    if (blocked) blocked.textContent = d.auto_blocked_today ?? '—';
    if (fpr)     fpr.textContent     = (d.false_positive_rate_7d != null) ? d.false_positive_rate_7d + '%' : '—';
    if (uptime)  uptime.textContent  = (d.model_uptime_pct != null) ? d.model_uptime_pct + '%' : '—';
  } catch(e) { console.warn('KPI load error', e); }
}

// 2. Confidence Distribution Chart
let _confidenceChart = null;
async function loadConfidenceDistribution() {
  try {
    const d   = await apiFetch('/api/aiml/confidence-distribution');
    const ctx = document.getElementById('confidenceChart');
    if (!ctx) return;
    if (_confidenceChart) _confidenceChart.destroy();
    _confidenceChart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: d.buckets.map(b => b.label),
        datasets: [{
          label: 'Transactions',
          data: d.buckets.map(b => b.count),
          backgroundColor: d.buckets.map((b, i) =>
            i >= 8 ? 'rgba(239,68,68,0.75)' : i >= 6 ? 'rgba(249,115,22,0.75)' :
            i >= 4 ? 'rgba(234,179,8,0.75)' : 'rgba(34,197,94,0.75)'),
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 10 } } },
          y: { ticks: { color: '#6b7280', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  } catch(e) { console.warn('Confidence distribution error', e); }
}

// 3. Drift Monitor
let _driftChart = null;
async function loadDriftMonitor() {
  try {
    const d = await apiFetch('/api/aiml/drift');
    const ctx = document.getElementById('driftChart');
    if (!ctx) return;
    if (_driftChart) _driftChart.destroy();
    _driftChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: d.weeks,
        datasets: [
          { label: 'Accuracy',  data: d.accuracy,  borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', tension: 0.4, pointRadius: 3, fill: false },
          { label: 'Precision', data: d.precision, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', tension: 0.4, pointRadius: 3, fill: false },
          { label: 'Recall',    data: d.recall,    borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', tension: 0.4, pointRadius: 3, fill: false },
          { label: 'F1',        data: d.f1,        borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: 0.4, pointRadius: 3, fill: false },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 10 } } },
          y: { ticks: { color: '#6b7280', font: { size: 10 } }, min: 80, max: 100 }
        }
      }
    });
    const alertEl = document.getElementById('driftAlert');
    if (alertEl) alertEl.classList.toggle('hidden', !d.alert);
  } catch(e) { console.warn('Drift monitor error', e); }
}

// 4. Ensemble Votes — called from openTxShap
async function loadEnsembleVotes(txId) {
  const panel = document.getElementById('modalEnsembleVotes');
  const cards = document.getElementById('ensembleVoteCards');
  const consensus = document.getElementById('ensembleConsensus');
  const finalScore = document.getElementById('ensembleFinalScore');
  if (!panel) return;
  try {
    const d = await apiFetch(`/api/aiml/ensemble-vote/${txId}`);
    const verdictColor = { BLOCK: 'text-red-600 bg-red-50 border-red-200', FLAG: 'text-orange-600 bg-orange-50 border-orange-200', CLEAR: 'text-green-600 bg-green-50 border-green-200' };
    const modelLabels = { random_forest: 'Random Forest', xgboost: 'XGBoost', isolation_forest: 'Isolation Forest', autoencoder: 'Autoencoder', sequence_detector: 'Sequence Detector' };
    if (cards) {
      cards.innerHTML = Object.entries(d.votes).map(([m, v]) => `
        <div class="rounded-xl border p-3 text-center ${verdictColor[v.verdict] || 'bg-gray-50 border-gray-200'}">
          <div class="text-[10px] font-semibold text-gray-500 mb-1">${modelLabels[m] || m}</div>
          <div class="text-xl font-black">${v.score.toFixed(1)}</div>
          <div class="text-[10px] font-bold mt-0.5">${v.verdict}</div>
        </div>`).join('');
    }
    if (consensus) consensus.textContent = d.consensus;
    if (finalScore) finalScore.textContent = d.final_score.toFixed(1);
    panel.classList.remove('hidden');
  } catch(e) { console.warn('Ensemble votes error', e); }
}

// 5. Submit Feedback
async function submitFeedback(feedbackType) {
  if (!_currentShapTxId) return;
  try {
    await apiFetch('/api/aiml/feedback', { method: 'POST', body: JSON.stringify({ tx_id: _currentShapTxId, feedback: feedbackType }) });
    // Toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-green-600 transition-all';
    toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>Feedback recorded: ${feedbackType.replace('_', ' ')}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  } catch(e) {
    alert('Failed to submit feedback: ' + (e.message || 'unknown error'));
  }
}

// 6. What-If Simulation
async function runSimulation() {
  const btn = document.querySelector('#simulateResult');
  const amount      = parseFloat(document.getElementById('simAmount')?.value || 10000);
  const corridor    = document.getElementById('simCorridor')?.value || 'USD/EUR';
  const hour        = parseInt(document.getElementById('simHour')?.value || 14);
  const country     = document.getElementById('simCountry')?.value || 'US';
  const firstTime   = document.getElementById('simFirstTime')?.checked || false;
  const resultDiv   = document.getElementById('simulateResult');
  if (!resultDiv) return;
  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = '<div class="text-center text-gray-400 py-4"><i class="fas fa-circle-notch fa-spin mr-2"></i>Running model...</div>';
  try {
    const d = await apiFetch('/api/aiml/simulate', {
      method: 'POST',
      body: JSON.stringify({ amount, corridor, hour, beneficiary_country: country, is_first_time_beneficiary: firstTime })
    });
    const riskColor = d.risk_score >= 80 ? '#ef4444' : d.risk_score >= 60 ? '#f97316' : '#22c55e';
    const verdictBg = d.verdict === 'BLOCK' ? 'bg-red-100 text-red-700' : d.verdict === 'FLAG' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
    resultDiv.innerHTML = `
      <div class="p-4 rounded-xl border" style="border-color:${riskColor}33;background:${riskColor}08">
        <div class="flex items-center gap-4 mb-3">
          <div class="text-4xl font-black" style="color:${riskColor}">${d.risk_score}</div>
          <div>
            <span class="px-3 py-1 rounded-full text-xs font-bold ${verdictBg}">${d.verdict}</span>
            <p class="text-xs text-gray-500 mt-1">Risk Score / 100</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-3">${d.narrative}</p>
        <div class="grid grid-cols-2 gap-2">
          ${(d.top_factors || []).map(f => `
            <div class="bg-white rounded-lg p-2 border border-gray-100">
              <div class="text-[10px] text-gray-400">${f.factor}</div>
              <div class="text-sm font-bold text-gray-700">${f.impact.toFixed(1)}</div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch(e) {
    resultDiv.innerHTML = `<p class="text-red-400 text-sm">Simulation failed: ${e.message}</p>`;
  }
}

// 7. Velocity Heatmap
async function loadVelocityHeatmap() {
  const container = document.getElementById('velocityHeatmap');
  if (!container) return;
  try {
    const d = await apiFetch('/api/aiml/velocity-heatmap');
    const matrix = d.matrix;
    const days   = d.days;
    const maxVal = Math.max(d.max_val, 1);
    const hours  = Array.from({length: 24}, (_, i) => i);

    let html = '<div style="display:grid;grid-template-columns:40px repeat(24,1fr);gap:2px;font-size:10px;">';
    // Header row
    html += '<div></div>';
    hours.forEach(h => { html += `<div class="text-center text-gray-400" style="font-size:9px;">${h}</div>`; });
    // Data rows
    matrix.forEach((row, di) => {
      html += `<div class="text-gray-400 text-right pr-1 flex items-center justify-end" style="font-size:9px;">${days[di]}</div>`;
      row.forEach((val, hi) => {
        const intensity = maxVal > 0 ? val / maxVal : 0;
        const r = Math.round(239 * intensity);
        const g = Math.round(68  * intensity);
        const b = Math.round(68  * intensity);
        const alpha = 0.1 + intensity * 0.85;
        const bg = val > 0 ? `rgba(${r},${g},${b},${alpha})` : 'rgba(100,100,120,0.08)';
        html += `<div title="${days[di]} ${hi}:00 — ${val} high-risk tx" style="background:${bg};border-radius:3px;height:18px;cursor:default;"></div>`;
      });
    });
    html += '</div>';
    container.innerHTML = html;
  } catch(e) {
    if (container) container.innerHTML = '<p class="text-gray-400 text-xs">Could not load heatmap.</p>';
    console.warn('Velocity heatmap error', e);
  }
}

// 8. Cohort Analysis
async function loadCohortAnalysis() {
  const panel   = document.getElementById('cohortPanel');
  const content = document.getElementById('cohortContent');
  if (!panel || !content) return;
  if (typeof ROLE !== 'undefined' && ROLE === 'client') {
    panel.classList.add('hidden');
    return;
  }
  const username = typeof USER !== 'undefined' ? USER : 'mohamad';
  try {
    const d = await apiFetch(`/api/aiml/cohort/${username}`);
    const verdictColor = d.verdict === 'ANOMALOUS' ? 'text-red-600' : d.verdict === 'ELEVATED' ? 'text-orange-500' : 'text-green-600';
    content.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-4">
        <div class="bg-gray-50 rounded-xl p-3">
          <div class="text-xs text-gray-400 mb-1">Your Avg Amount</div>
          <div class="font-bold text-gray-800">$${Number(d.user_avg_amount).toLocaleString('en-US',{maximumFractionDigits:0})}</div>
          <div class="text-[10px] text-gray-400">Cohort: $${Number(d.cohort_avg_amount).toLocaleString('en-US',{maximumFractionDigits:0})}</div>
        </div>
        <div class="bg-gray-50 rounded-xl p-3">
          <div class="text-xs text-gray-400 mb-1">Your Avg Risk</div>
          <div class="font-bold text-gray-800">${d.user_avg_risk.toFixed(1)}</div>
          <div class="text-[10px] text-gray-400">Cohort: ${d.cohort_avg_risk.toFixed(1)}</div>
        </div>
        <div class="bg-gray-50 rounded-xl p-3">
          <div class="text-xs text-gray-400 mb-1">Your Tx Count</div>
          <div class="font-bold text-gray-800">${d.user_tx_count}</div>
          <div class="text-[10px] text-gray-400">Cohort avg: ${d.cohort_avg_tx_count}</div>
        </div>
        <div class="bg-gray-50 rounded-xl p-3">
          <div class="text-xs text-gray-400 mb-1">Anomaly Score</div>
          <div class="font-bold ${verdictColor}">${d.anomaly_score.toFixed(2)}σ</div>
          <div class="text-[10px] font-semibold ${verdictColor}">${d.verdict}</div>
        </div>
      </div>`;
  } catch(e) {
    content.innerHTML = '<p class="text-gray-400 text-xs">Could not load cohort data.</p>';
    console.warn('Cohort analysis error', e);
  }
}

// 9. Thresholds
async function loadThresholds() {
  const panel = document.getElementById('thresholdsPanel');
  if (!panel) return;
  if (typeof ROLE !== 'undefined' && ROLE !== 'admin') {
    panel.classList.add('hidden');
    return;
  }
  try {
    const d = await apiFetch('/api/aiml/thresholds');
    const flagSlider     = document.getElementById('flagThreshSlider');
    const blockSlider    = document.getElementById('blockThreshSlider');
    const fourEyesSlider = document.getElementById('fourEyesThreshSlider');
    const flagVal        = document.getElementById('flagThreshVal');
    const blockVal       = document.getElementById('blockThreshVal');
    const fourEyesVal    = document.getElementById('fourEyesThreshVal');
    if (flagSlider)     { flagSlider.value     = d.flag_threshold;         if (flagVal)     flagVal.textContent     = d.flag_threshold; }
    if (fourEyesSlider) { fourEyesSlider.value = d.four_eyes_threshold;    if (fourEyesVal) fourEyesVal.textContent = d.four_eyes_threshold; }
    if (blockSlider)    { blockSlider.value    = d.block_threshold;        if (blockVal)    blockVal.textContent    = d.block_threshold; }
  } catch(e) { console.warn('Thresholds load error', e); }
}

async function saveThresholds() {
  const flag     = parseFloat(document.getElementById('flagThreshSlider')?.value     || 60);
  const block    = parseFloat(document.getElementById('blockThreshSlider')?.value    || 85);
  const fourEyes = parseFloat(document.getElementById('fourEyesThreshSlider')?.value || 75);
  try {
    await apiFetch('/api/aiml/thresholds', {
      method: 'POST',
      body: JSON.stringify({ flag_threshold: flag, block_threshold: block, four_eyes_threshold: fourEyes })
    });
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-green-600';
    toast.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Thresholds saved';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  } catch(e) {
    alert('Failed to save thresholds: ' + (e.message || 'unknown error'));
  }
}

// 10. AI Narrative — called from openTxShap
async function loadAINarrative(txId) {
  const narrativeDiv  = document.getElementById('modalNarrative');
  const narrativeText = document.getElementById('modalNarrativeText');
  if (!narrativeDiv || !narrativeText) return;
  try {
    const d = await apiFetch(`/api/aiml/narrative/${txId}`);
    narrativeText.textContent = d.narrative || '';
    narrativeDiv.classList.remove('hidden');
    const confBadge = narrativeDiv.querySelector('.confidence-badge');
    if (!confBadge && d.confidence) {
      const badge = document.createElement('span');
      const cColor = d.confidence === 'high' ? 'bg-red-100 text-red-700' : d.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
      badge.className = `ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold confidence-badge ${cColor}`;
      badge.textContent = d.confidence.toUpperCase() + ' CONFIDENCE';
      narrativeDiv.querySelector('.flex')?.appendChild(badge);
    }
  } catch(e) { console.warn('Narrative load error', e); }
}
