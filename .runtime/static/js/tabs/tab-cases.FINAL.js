// ============================================================
// tab-cases.js — Case Management Tab
// ============================================================

// ── View All Breached Cases ───────────────────────────────────
function viewAllBreachedCases() {
  // Clear all filters so all cases (including breached SLA ones) are visible
  const statusEl = document.getElementById('caseFilterStatus');
  const severityEl = document.getElementById('caseFilterSeverity');
  const typeEl = document.getElementById('caseFilterType');
  const searchEl = document.getElementById('caseSearch');
  if (statusEl) statusEl.value = '';
  if (severityEl) severityEl.value = '';
  if (typeEl) typeEl.value = '';
  if (searchEl) searchEl.value = '';
  loadCases();
  // Scroll cases table into view
  setTimeout(() => {
    const table = document.getElementById('casesTable') || document.querySelector('#tab-cases table');
    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 400);
}

// ── SLA Dashboard ────────────────────────────────────────────
let _slaAllRows = [];   // raw cases from API

async function loadSlaDashboard() {
  const tbody = document.getElementById('slaDashBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading SLA data…</td></tr>';
  try {
    const [slaData, txData] = await Promise.all([
      apiFetch('/api/compliance/sla-status'),
      apiFetch('/api/transactions?limit=500').catch(() => ({ transactions: [] }))
    ]);
    // Build tx lookup by id
    const txMap = {};
    (txData.transactions || []).forEach(t => { txMap[t.id] = t; });

    // Merge SLA case with its transaction
    _slaAllRows = (slaData.cases || []).map(c => ({
      ...c,
      tx: txMap[c.settlement_id] || null
    }));

    // Sort by urgency: breached → at_risk → warning → on_track → met → no_deadline
    const order = { breached: 0, at_risk: 1, warning: 2, on_track: 3, met: 4, no_deadline: 5 };
    _slaAllRows.sort((a, b) => (order[a.sla_state] ?? 9) - (order[b.sla_state] ?? 9));

    renderSlaDashboard();
  } catch(e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-red-400">Failed to load: ${e.message}</td></tr>`;
    console.error('SLA dashboard error:', e);
  }
}

function renderSlaDashboard() {
  const stateFilter    = (document.getElementById('slaDashFilter')?.value || '').toLowerCase();
  const severityFilter = (document.getElementById('slaDashSeverity')?.value || '').toLowerCase();

  const rows = _slaAllRows.filter(r =>
    (!stateFilter    || r.sla_state === stateFilter) &&
    (!severityFilter || (r.severity||'').toLowerCase() === severityFilter)
  );

  // KPI counts from full dataset
  const all = _slaAllRows;
  const cnt = s => all.filter(r => r.sla_state === s).length;
  const nBreach  = cnt('breached');
  const nAtRisk  = cnt('at_risk');
  const nWarn    = cnt('warning');
  const nOnTrack = cnt('on_track');
  const nMet     = cnt('met');
  const total    = all.length;
  const rateNum  = total ? Math.round((nMet + nOnTrack) / total * 100) : 0;

  const _set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  _set('slaKpiBreach',  nBreach);
  _set('slaKpiAtRisk',  nAtRisk);
  _set('slaKpiWarn',    nWarn);
  _set('slaKpiOnTrack', nOnTrack);
  _set('slaKpiMet',     nMet);
  _set('slaKpiRate',    total ? rateNum + '%' : '—');
  _set('slaHealthLabel', total
    ? `${rateNum}% compliant · ${nBreach} breached · ${nAtRisk} at risk · ${total} total`
    : 'No data');

  // Progress bar widths
  const pct = n => total ? (n / total * 100).toFixed(1) + '%' : '0%';
  const _bar = (id, n) => { const el = document.getElementById(id); if (el) el.style.width = pct(n); };
  _bar('slaBarMet',      nMet);
  _bar('slaBarOnTrack',  nOnTrack);
  _bar('slaBarWarn',     nWarn);
  _bar('slaBarAtRisk',   nAtRisk);
  _bar('slaBarBreach',   nBreach);

  // Severity badge helper
  const sevBadge = s => {
    const map = { critical:'bg-red-100 text-red-600', high:'bg-orange-100 text-orange-600',
                  medium:'bg-yellow-100 text-yellow-700', low:'bg-green-100 text-green-600' };
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[s]||'bg-gray-100 text-gray-500'}">${s||'—'}</span>`;
  };

  // Case status badge
  const statusBadge = s => {
    const map = { open:'text-red-500', investigating:'text-yellow-500', escalated:'text-orange-500',
                  resolved:'text-green-500', closed:'text-gray-400', dismissed:'text-gray-400' };
    return `<span class="uppercase text-[10px] font-semibold ${map[s]||'text-gray-400'}">${s||'—'}</span>`;
  };

  // SLA state badge
  const slaBadge = (state, hrs) => {
    const hrsLabel = (hrs !== null && hrs !== undefined)
      ? (Math.abs(hrs) < 1 ? Math.round(Math.abs(hrs)*60)+'m' : Math.abs(Math.round(hrs))+'h')
      : '';
    const cfg = {
      met:        ['bg-emerald-100 text-emerald-700', 'fa-check',              'Met'],
      on_track:   ['bg-green-100 text-green-700',     'fa-circle-check',       hrsLabel+' left'],
      warning:    ['bg-yellow-100 text-yellow-700',   'fa-clock',              hrsLabel+' left'],
      at_risk:    ['bg-orange-100 text-orange-700',   'fa-hourglass-half',     hrsLabel+' left'],
      breached:   ['bg-red-100 text-red-700',         'fa-circle-exclamation', hrsLabel+' over'],
      no_deadline:['bg-gray-100 text-gray-500',       'fa-minus',              'No deadline'],
    }[state] || ['bg-gray-100 text-gray-400', 'fa-minus', state];
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg[0]}"><i class="fas ${cfg[1]}"></i>${cfg[2]}</span>`;
  };

  const tbody = document.getElementById('slaDashBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-gray-400"><i class="fas fa-filter mr-2"></i>No records match the selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const tx      = r.tx;
    const txId    = r.settlement_id || '—';
    const amount  = tx ? '$' + Number(tx.amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
    const bene    = tx?.beneficiary_name || r.beneficiary_name || '—';
    const deadline = r.sla_deadline
      ? new Date(r.sla_deadline).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
      : '—';
    const timeLeftTxt = (() => {
      if (!r.hours_remaining && r.hours_remaining !== 0) return '<span class="text-gray-300">—</span>';
      const h = r.hours_remaining;
      const abs = Math.abs(h);
      const label = abs < 1 ? Math.round(abs*60)+'m' : Math.round(abs)+'h';
      if (h < 0) return `<span class="text-red-500 font-semibold">+${label} overdue</span>`;
      if (h <= 4) return `<span class="text-orange-500 font-semibold">${label}</span>`;
      if (h <= 24) return `<span class="text-yellow-600 font-semibold">${label}</span>`;
      return `<span class="text-green-600">${label}</span>`;
    })();

    return `<tr class="border-b border-gray-100 hover:bg-accent/5 transition cursor-pointer" onclick="openCaseModal('${r.id}')">
      <td class="py-2 px-3 font-mono text-gray-400 text-[10px]">${String(txId).slice(0,8)}…</td>
      <td class="py-2 px-3 font-semibold text-accent">${r.case_number||'—'}</td>
      <td class="py-2 px-3 text-gray-700 max-w-[130px] truncate">${bene}</td>
      <td class="py-2 px-3 text-right font-semibold text-gray-800">${amount}</td>
      <td class="py-2 px-3 text-center">${sevBadge(r.severity)}</td>
      <td class="py-2 px-3 text-center">${statusBadge(r.status)}</td>
      <td class="py-2 px-3 text-center">${slaBadge(r.sla_state, r.hours_remaining)}</td>
      <td class="py-2 px-3 text-right text-gray-500 text-[10px]">${deadline}</td>
      <td class="py-2 px-3 text-right">${timeLeftTxt}</td>
      <td class="py-2 px-3 text-center">
        <button onclick="event.stopPropagation();openCaseModal('${r.id}')" class="px-2 py-1 rounded-lg bg-accent/10 text-accent text-[10px] font-semibold hover:bg-accent/20 transition">
          <i class="fas fa-eye mr-0.5"></i>View
        </button>
      </td>
    </tr>`;
  }).join('');
}

// ── End SLA Dashboard ─────────────────────────────────────────

// ── Local search filter ───────────────────────────────────────
function filterCasesLocal() {
  const q = (document.getElementById('caseSearch')?.value || '').toLowerCase();
  document.querySelectorAll('#casesBody tr[data-case-id]').forEach(row => {
    row.style.display = !q || row.dataset.searchText?.includes(q) ? '' : 'none';
  });
}

// ── SLA badge helper for cases table ────────────────────────
function getSLABadge(c) {
  const slaHours = { critical: 4, high: 24, medium: 72, low: 168 };
  if (c.status === 'resolved' || c.status === 'closed' || c.status === 'dismissed') {
    return '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700"><i class="fas fa-check mr-0.5"></i>Met</span>';
  }
  if (!c.sla_deadline && !c.created_at) return '<span class="text-gray-300 text-[10px]">—</span>';
  const deadline = c.sla_deadline ? new Date(c.sla_deadline) : new Date(new Date(c.created_at).getTime() + (slaHours[c.severity]||72)*3600000);
  const hoursLeft = (deadline - new Date()) / 3600000;
  if (hoursLeft < 0) return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600"><i class="fas fa-circle-exclamation mr-0.5"></i>Breached</span>`;
  if (hoursLeft <= 4) return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600"><i class="fas fa-hourglass-half mr-0.5"></i>${Math.round(hoursLeft)}h left</span>`;
  if (hoursLeft <= 24) return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700"><i class="fas fa-clock mr-0.5"></i>${Math.round(hoursLeft)}h left</span>`;
  return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-600"><i class="fas fa-circle-check mr-0.5"></i>${Math.round(hoursLeft)}h left</span>`;
}

async function loadCases() {
  const statusFilter = document.getElementById('caseFilterStatus')?.value || '';
  const severityFilter = document.getElementById('caseFilterSeverity')?.value || '';
  const typeFilter = document.getElementById('caseFilterType')?.value || '';

  let url = '/api/compliance/cases?';
  if (statusFilter) url += `status=${statusFilter}&`;
  if (severityFilter) url += `severity=${severityFilter}&`;
  if (typeFilter) url += `case_type=${typeFilter}&`;

  try {
    const data = await apiFetch(url);

    if (data.summary) {
      document.getElementById('caseOpen').textContent = data.summary.open || 0;
      document.getElementById('caseInvestigating').textContent = data.summary.investigating || 0;
      document.getElementById('caseEscalated').textContent = data.summary.escalated || 0;
      document.getElementById('caseResolved').textContent = data.summary.resolved || 0;
    }

    window._loadedCases = data.cases || [];

    // SLA Breach Banner
    const breached = (data.cases||[]).filter(c => {
      if (['resolved','closed','dismissed'].includes(c.status)) return false;
      const slaHours = { critical:4, high:24, medium:72, low:168 };
      const dl = c.sla_deadline ? new Date(c.sla_deadline) : new Date(new Date(c.created_at).getTime() + (slaHours[c.severity]||72)*3600000);
      return (dl - new Date()) < 0;
    });
    const banner = document.getElementById('caseBreachBanner');
    const bannerDetail = document.getElementById('caseBreachDetail');
    if (banner && breached.length > 0) {
      banner.classList.remove('hidden');
      bannerDetail.textContent = `${breached.length} case${breached.length>1?'s':''} have exceeded their SLA deadline: ${breached.map(c=>c.case_number).join(', ')}`;
    } else if (banner) {
      banner.classList.add('hidden');
    }

    const tbody = document.getElementById('casesBody');
    if (!data.cases || data.cases.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" class="text-center py-8 text-gray-600">No compliance cases found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.cases.map(c => {
      const sevClass = `severity-${c.severity}`;
      const statusBg = c.status === 'open' ? 'text-red-400' : c.status === 'investigating' ? 'text-yellow-400' : c.status === 'escalated' ? 'text-orange-400' : c.status === 'resolved' ? 'text-green-400' : 'text-gray-400';
      const slaHtml = getSLABadge(c);
      const searchText = [c.case_number, c.case_type, c.severity, c.status, c.beneficiary_name, c.assigned_to, c.sender_name].join(' ').toLowerCase();
      return `<tr class="border-b border-gray-200/50 hover:bg-gray-50 cursor-pointer" data-case-id="${c.id}" data-search-text="${searchText}" onclick="if(!event.target.closest('input,button'))openCaseModal('${c.id}')">
        <td class="py-2 px-2" onclick="event.stopPropagation()"><input type="checkbox" class="case-checkbox rounded" value="${c.id}" onchange="updateCaseBulkBar()"></td>
        <td class="py-2 px-2 font-mono text-accent">${c.case_number}</td>
        <td class="py-2 px-2 uppercase text-xs">${c.case_type}</td>
        <td class="py-2 px-2 text-center"><span class="badge ${sevClass}">${c.severity}</span></td>
        <td class="py-2 px-2 text-center"><span class="${statusBg} uppercase text-xs font-medium">${c.status}</span></td>
        <td class="py-2 px-2">${c.beneficiary_name || 'N/A'}</td>
        <td class="py-2 px-2 text-right">$${Number(c.amount || 0).toLocaleString()}</td>
        <td class="py-2 px-2 text-right font-mono ${(c.risk_score||0) >= 80 ? 'text-red-400' : 'text-yellow-400'}">${(c.risk_score || 0).toFixed(1)}</td>
        <td class="py-2 px-2 text-center">${slaHtml}</td>
        <td class="py-2 px-2">${c.assigned_to || '<span class="text-gray-400 italic">Unassigned</span>'}</td>
        <td class="py-2 px-2 text-gray-500">${c.created_at ? c.created_at.substring(0, 16) : ''}</td>
        <td class="py-2 px-2 text-center">
          <button onclick="event.stopPropagation();openCaseModal('${c.id}')" class="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition">
            <i class="fas fa-eye mr-1"></i>View
          </button>
        </td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('Cases error:', e); }
}

// ── Bulk actions ─────────────────────────────────────────────
function updateCaseBulkBar() {
  const checked = [...document.querySelectorAll('.case-checkbox:checked')];
  const bar = document.getElementById('caseBulkBar');
  const count = document.getElementById('caseBulkCount');
  if (!bar) return;
  if (checked.length > 0) { bar.classList.remove('hidden'); count.textContent = checked.length; }
  else { bar.classList.add('hidden'); }
}
function toggleAllCases(cb) {
  document.querySelectorAll('.case-checkbox').forEach(c => { c.checked = cb.checked; });
  updateCaseBulkBar();
}
function clearCaseBulk() {
  document.querySelectorAll('.case-checkbox').forEach(c => { c.checked = false; });
  const sa = document.getElementById('caseSelectAll');
  if (sa) sa.checked = false;
  updateCaseBulkBar();
}
async function bulkCaseAction(action) {
  const ids = [...document.querySelectorAll('.case-checkbox:checked')].map(c => c.value);
  if (!ids.length) return;
  if (!confirm(`${action.charAt(0).toUpperCase()+action.slice(1)} ${ids.length} case(s)?`)) return;
  try {
    await apiFetch('/api/compliance/cases/bulk', { method:'POST', body: JSON.stringify({ action, case_ids: ids }) });
    clearCaseBulk();
    loadCases();
    showToast(`${ids.length} case(s) ${action}d`, 'success');
  } catch(e) { showToast('Bulk action failed: ' + e.message, 'error'); }
}
function showBulkAssign() {
  const ids = [...document.querySelectorAll('.case-checkbox:checked')].map(c => c.value);
  if (!ids.length) return;
  document.getElementById('assignModal')?.remove();
  const opts = CASE_ASSIGNEES.map(n => `<option value="${n}">${n}</option>`).join('');
  const modal = document.createElement('div');
  modal.id = 'assignModal';
  modal.className = 'fixed inset-0 flex items-center justify-center bg-black/50';
  modal.style.zIndex = 400;
  modal.innerHTML = `<div class="bg-white rounded-xl shadow-2xl p-6 w-80">
    <h3 class="text-sm font-semibold text-gray-800 mb-4"><i class="fas fa-user-plus mr-2 text-blue-500"></i>Bulk Assign (${ids.length} cases)</h3>
    <select id="bulkAssigneeSelect" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-4">
      <option value="">— Select assignee —</option>${opts}
    </select>
    <div class="flex gap-2">
      <button onclick="submitBulkAssign(${JSON.stringify(ids)})" class="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-semibold">Assign</button>
      <button onclick="this.closest('#assignModal').remove()" class="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}
async function submitBulkAssign(ids) {
  const assignee = document.getElementById('bulkAssigneeSelect').value;
  if (!assignee) { alert('Please select an assignee.'); return; }
  try {
    await apiFetch('/api/compliance/cases/bulk', { method:'POST', body: JSON.stringify({ action:'assign', case_ids: ids, assigned_to: assignee }) });
    document.getElementById('assignModal')?.remove();
    clearCaseBulk();
    loadCases();
    showToast(`Assigned ${ids.length} case(s) to ${assignee}`, 'success');
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

// ── Modal tab switching ───────────────────────────────────────
let _openCaseId = null;

function switchCaseTab(tab) {
  const tabs = ['details','actions','timeline','notes','links'];
  tabs.forEach(t => {
    const btn  = document.getElementById('caseTab' + t.charAt(0).toUpperCase() + t.slice(1));
    const pane = document.getElementById('caseModal' + t.charAt(0).toUpperCase() + t.slice(1));
    const active = t === tab;
    if (btn) {
      btn.className = active
        ? 'case-tab-btn px-4 py-2.5 text-xs font-semibold text-accent border-b-2 border-accent bg-white -mb-px transition'
        : 'case-tab-btn px-4 py-2.5 text-xs font-medium text-gray-400 border-b-2 border-transparent hover:text-gray-700 -mb-px transition';
    }
    if (pane) {
      pane.classList.toggle('hidden', !active);
    }
  });
  // Lazy-load sections on first click
  if (tab === 'timeline' && _openCaseId) loadCaseTimeline(_openCaseId);
  if (tab === 'notes'    && _openCaseId) loadCaseNotes(_openCaseId);
  if (tab === 'links'    && _openCaseId) loadCaseLinks(_openCaseId);
}

async function loadCaseTimeline(caseId) {
  const pane = document.getElementById('caseModalTimeline');
  if (!pane) return;
  pane.innerHTML = '<div class="text-center py-6 text-gray-400 text-xs"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading timeline…</div>';
  try {
    const data = await apiFetch(`/api/compliance/cases/${caseId}/timeline`);
    const events = data.timeline || [];
    if (!events.length) { pane.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">No timeline events yet.</p>'; return; }
    const iconMap = { 'Case Created':'fa-folder-plus text-blue-500', 'Resolved':'fa-check-circle text-green-500', 'Escalated':'fa-arrow-up text-orange-500', 'SAR Filed':'fa-file-alt text-red-400', 'Note Added':'fa-comment text-purple-400', 'Case Linked':'fa-link text-indigo-400', 'Findings Added':'fa-magnifying-glass text-yellow-500', 'Case Updated':'fa-pen text-gray-400', 'Investigation Started':'fa-search text-yellow-500' };
    pane.innerHTML = `<div class="relative pl-5">
      <div class="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      ${events.map(e => {
        const icon = iconMap[e.event] || 'fa-circle text-gray-400';
        const ts = e.ts ? new Date(e.ts).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
        return `<div class="relative mb-4 pl-5">
          <div class="absolute -left-3 top-0.5 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
            <i class="fas ${icon} text-[10px]"></i>
          </div>
          <p class="text-xs font-semibold text-gray-800">${e.event}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">${ts} · <span class="text-gray-500">${e.actor||'System'}</span></p>
          ${e.detail ? `<p class="text-[10px] text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">${e.detail}</p>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  } catch(e) { pane.innerHTML = `<p class="text-xs text-red-400 text-center py-4">Error: ${e.message}</p>`; }
}

async function loadCaseNotes(caseId) {
  const pane = document.getElementById('caseModalNotes');
  if (!pane) return;
  pane.innerHTML = '<div class="text-center py-4 text-gray-400 text-xs"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading notes…</div>';
  try {
    const data = await apiFetch(`/api/compliance/cases/${caseId}/notes`);
    const notes = data.notes || [];
    const thread = notes.length
      ? notes.map(n => `<div class="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">${(n.author||'?')[0].toUpperCase()}</span>
            <span class="text-xs font-semibold text-gray-700">${n.author||'Unknown'}</span>
            <span class="text-[10px] text-gray-400 ml-auto">${new Date(n.created_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
          </div>
          <p class="text-sm text-gray-600 ml-8">${n.note}</p>
        </div>`).join('')
      : '<p class="text-xs text-gray-400 text-center py-4">No notes yet. Add the first one below.</p>';
    pane.innerHTML = `<div class="space-y-3 mb-4 max-h-56 overflow-y-auto">${thread}</div>
      <div class="flex gap-2 border-t border-gray-100 pt-3">
        <textarea id="caseNoteInput" rows="2" class="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none" placeholder="Add an internal note…"></textarea>
        <button onclick="submitCaseNote('${caseId}')" class="px-4 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition self-end pb-2 pt-2">Post</button>
      </div>`;
  } catch(e) { pane.innerHTML = `<p class="text-xs text-red-400 text-center py-4">Error: ${e.message}</p>`; }
}

async function submitCaseNote(caseId) {
  const input = document.getElementById('caseNoteInput');
  const note = input?.value.trim();
  if (!note) return;
  try {
    await apiFetch(`/api/compliance/cases/${caseId}/notes`, { method:'POST', body: JSON.stringify({ note }) });
    input.value = '';
    loadCaseNotes(caseId);
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

async function loadCaseLinks(caseId) {
  const pane = document.getElementById('caseModalLinks');
  if (!pane) return;
  pane.innerHTML = '<div class="text-center py-4 text-gray-400 text-xs"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading linked cases…</div>';
  try {
    const data = await apiFetch(`/api/compliance/cases/${caseId}/links`);
    const links = data.links || [];
    const list = links.length
      ? `<div class="space-y-2 mb-4">${links.map(l => `
          <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 cursor-pointer hover:bg-accent/5 transition" onclick="openCaseModal('${l.linked_case_id}')">
            <i class="fas fa-link text-accent text-xs shrink-0"></i>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-accent">${l.case_number}</p>
              <p class="text-[10px] text-gray-500 truncate">${l.beneficiary_name||'—'} · ${l.reason||'Related case'}</p>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 capitalize">${l.status||'—'}</span>
          </div>`).join('')}</div>`
      : '<p class="text-xs text-gray-400 text-center py-4 mb-3">No linked cases yet.</p>';
    pane.innerHTML = `${list}
      <div class="border-t border-gray-100 pt-3">
        <p class="text-xs font-semibold text-gray-700 mb-2">Link a Related Case</p>
        <div class="flex gap-2">
          <input id="linkCaseInput" type="text" class="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs" placeholder="Case # (e.g. CM-2026-001)">
          <input id="linkReasonInput" type="text" class="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs" placeholder="Reason (e.g. Same beneficiary)">
          <button onclick="submitCaseLink('${caseId}')" class="px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition">Link</button>
        </div>
      </div>`;
  } catch(e) { pane.innerHTML = `<p class="text-xs text-red-400 text-center py-4">Error: ${e.message}</p>`; }
}

async function submitCaseLink(caseId) {
  const linked = document.getElementById('linkCaseInput')?.value.trim();
  const reason = document.getElementById('linkReasonInput')?.value.trim() || 'Related case';
  if (!linked) return;
  try {
    await apiFetch(`/api/compliance/cases/${caseId}/links`, { method:'POST', body: JSON.stringify({ linked_case_number: linked, reason }) });
    loadCaseLinks(caseId);
    showToast('Case linked', 'success');
  } catch(e) { showToast('Error: '+e.message, 'error'); }
}

async function openCaseModal(caseId) {
  _openCaseId = caseId;
  switchCaseTab('details');
  try {
    const c = await apiFetch(`/api/compliance/cases/${caseId}`);
    document.getElementById('caseModalTitle').textContent = `Case ${c.case_number}`;
    const sub = document.getElementById('caseModalSubtitle');
    if (sub) sub.textContent = `${(c.case_type||'').toUpperCase()} · ${(c.severity||'').toUpperCase()} · Assigned to ${c.assigned_to||'Unassigned'}`;
    const sevClass = `severity-${c.severity}`;
    const statusBg = c.status === 'open' ? 'text-red-400' : c.status === 'investigating' ? 'text-yellow-400' : c.status === 'escalated' ? 'text-orange-400' : c.status === 'resolved' ? 'text-green-400' : 'text-gray-400';

    const slaHours = { critical: 4, high: 24, medium: 72, low: 168 };
    const maxHours = slaHours[c.severity] || 72;
    let slaBanner = '';
    if (c.status === 'resolved' || c.status === 'closed') {
      slaBanner = `<div class="flex items-center gap-3 rounded-xl px-5 py-4 mb-4 bg-green-50 border border-green-200">
        <i class="fas fa-check-circle text-3xl text-green-500"></i>
        <div>
          <p class="text-xs text-green-600 font-semibold uppercase tracking-wider">SLA Status</p>
          <p class="text-2xl font-extrabold text-green-500 leading-tight">MET</p>
          <p class="text-xs text-green-500 mt-0.5">Case resolved within the ${maxHours}h ${c.severity} SLA window</p>
        </div>
      </div>`;
    } else if (c.created_at) {
      const created = new Date(c.created_at);
      const hoursElapsed = (new Date() - created) / (1000 * 60 * 60);
      const remaining = maxHours - hoursElapsed;
      if (remaining <= 0) {
        const overBy = Math.abs(remaining);
        const overHrs = Math.floor(overBy);
        const overMins = Math.floor((overBy - overHrs) * 60);
        slaBanner = `<div class="flex items-center gap-3 rounded-xl px-5 py-4 mb-4 bg-red-50 border-2 border-red-500 animate-pulse">
          <i class="fas fa-exclamation-triangle text-4xl text-red-600"></i>
          <div>
            <p class="text-xs text-red-600 font-semibold uppercase tracking-wider">SLA Status</p>
            <p class="text-3xl font-extrabold text-red-600 leading-tight">BREACHED</p>
            <p class="text-sm font-semibold text-red-500 mt-0.5">Overdue by ${overHrs}h ${overMins}m · ${c.severity?.toUpperCase()} cases must be resolved within ${maxHours}h</p>
          </div>
        </div>`;
      } else if (remaining <= maxHours * 0.25) {
        const hrs = Math.floor(remaining);
        const mins = Math.floor((remaining - hrs) * 60);
        slaBanner = `<div class="flex items-center gap-3 rounded-xl px-5 py-4 mb-4 bg-orange-50 border-2 border-orange-400">
          <i class="fas fa-clock text-4xl text-orange-500"></i>
          <div>
            <p class="text-xs text-orange-600 font-semibold uppercase tracking-wider">SLA Status</p>
            <p class="text-3xl font-extrabold text-orange-500 leading-tight">${hrs}h ${mins}m REMAINING</p>
            <p class="text-sm font-semibold text-orange-400 mt-0.5">Critical — ${c.severity?.toUpperCase()} SLA deadline approaching (${maxHours}h limit)</p>
          </div>
        </div>`;
      } else {
        const hrs = Math.floor(remaining);
        const mins = Math.floor((remaining - hrs) * 60);
        slaBanner = `<div class="flex items-center gap-3 rounded-xl px-5 py-4 mb-4 bg-blue-50 border border-blue-200">
          <i class="fas fa-clock text-3xl text-blue-400"></i>
          <div>
            <p class="text-xs text-blue-500 font-semibold uppercase tracking-wider">SLA Status</p>
            <p class="text-2xl font-extrabold text-blue-500 leading-tight">${hrs}h ${mins}m Remaining</p>
            <p class="text-xs text-blue-400 mt-0.5">${c.severity?.toUpperCase()} cases must be resolved within ${maxHours}h of creation</p>
          </div>
        </div>`;
      }
    }

    // Stage timing calculation
    const ageHrs = c.created_at ? Math.round((new Date() - new Date(c.created_at)) / 3600000) : null;
    const openToClose = (c.created_at && c.closed_at)
      ? Math.round((new Date(c.closed_at) - new Date(c.created_at)) / 3600000) : null;
    const stageTiming = `<div class="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
      <p class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Stage Timing</p>
      <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div><p class="text-gray-400">Age</p><p class="font-bold text-gray-700">${ageHrs !== null ? ageHrs+'h' : '—'}</p></div>
        <div><p class="text-gray-400">SLA Window</p><p class="font-bold text-gray-700">${maxHours}h</p></div>
        <div><p class="text-gray-400">Time to Close</p><p class="font-bold ${openToClose && openToClose > maxHours ? 'text-red-500' : 'text-green-600'}">${openToClose !== null ? openToClose+'h' : c.status === 'resolved' || c.status === 'closed' ? '—' : 'Open'}</p></div>
      </div>
    </div>`;

    document.getElementById('caseModalDetails').innerHTML = `
      ${slaBanner}
      ${stageTiming}
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Status</p><p class="${statusBg} font-bold uppercase text-sm mt-0.5">${c.status}</p></div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Severity</p><p class="mt-0.5"><span class="badge ${sevClass}">${c.severity}</span></p></div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Type</p><p class="text-gray-800 text-xs font-semibold uppercase mt-0.5">${c.case_type}</p></div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Risk Score</p><p class="text-xl font-bold mt-0.5 ${(c.risk_score||0) >= 80 ? 'text-red-500' : 'text-yellow-500'}">${(c.risk_score || 0).toFixed(1)}</p></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Sender</p><p class="text-gray-800 text-xs mt-0.5">${c.sender_name || 'N/A'}</p></div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Beneficiary</p><p class="text-gray-800 text-xs mt-0.5">${c.beneficiary_name || 'N/A'}</p></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Amount</p><p class="text-xl font-bold text-gray-800 mt-0.5">$${Number(c.amount || 0).toLocaleString()}</p></div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Assigned To</p><p class="text-xs text-gray-700 mt-0.5">${c.assigned_to || '<span class="text-gray-400 italic">Unassigned</span>'}</p></div>
      </div>
      <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Description</p><p class="text-xs text-gray-600 mt-1">${c.description || 'No description'}</p></div>
      ${c.findings ? `<div class="bg-yellow-50 rounded-xl p-3 border border-yellow-100"><p class="text-[10px] text-yellow-600 font-semibold">Findings</p><p class="text-xs text-gray-700 mt-1">${c.findings}</p></div>` : ''}
      ${c.resolution ? `<div class="bg-green-50 rounded-xl p-3 border border-green-100"><p class="text-[10px] text-green-600 font-semibold">Resolution</p><p class="text-xs text-gray-700 mt-1">${c.resolution}</p></div>` : ''}
      ${c.sar_number ? `<div class="bg-orange-50 rounded-xl p-3 border border-orange-100"><p class="text-[10px] text-orange-600 font-semibold">SAR Number</p><p class="text-xs font-mono text-orange-700 mt-1">${c.sar_number}</p></div>` : ''}
      <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><p class="text-[10px] text-gray-400">Settlement ID</p><p class="text-[10px] text-gray-500 font-mono mt-1">${c.settlement_id || 'N/A'}</p></div>
      <div class="grid grid-cols-2 gap-3 text-[10px] text-gray-400">
        <div class="bg-gray-50 rounded-xl p-2 border border-gray-100">Created: <span class="text-gray-600">${c.created_at?.slice(0,16)||'N/A'}</span></div>
        <div class="bg-gray-50 rounded-xl p-2 border border-gray-100">Updated: <span class="text-gray-600">${c.updated_at?.slice(0,16)||'N/A'}</span></div>
      </div>
    `;

    // Actions section — rich action cards list
    const actionsDiv = document.getElementById('caseModalActions');
    if (actionsDiv) {
      const isActive = c.status !== 'resolved' && c.status !== 'closed' && c.status !== 'dismissed';
      const actions = [
        isActive ? {
          icon: 'fa-magnifying-glass', color: 'yellow', label: 'Mark as Under Investigation', btnLabel: 'Investigate',
          desc: 'Move this case to investigating status and assign an analyst.',
          onclick: `caseAction('${c.id}', 'investigate')`
        } : null,
        isActive ? {
          icon: 'fa-arrow-up', color: 'orange', label: 'Escalate Case', btnLabel: 'Escalate',
          desc: 'Escalate to senior compliance officer for immediate review.',
          onclick: `caseAction('${c.id}', 'escalate')`
        } : null,
        isActive ? {
          icon: 'fa-check-circle', color: 'green', label: 'Resolve Case', btnLabel: 'Resolve',
          desc: 'Mark this case as resolved after completing the investigation.',
          onclick: `caseAction('${c.id}', 'resolve')`
        } : null,
        !c.sar_number ? {
          icon: 'fa-file-shield', color: 'red', label: 'File Suspicious Activity Report (SAR)', btnLabel: 'File SAR',
          desc: 'Submit a formal SAR to the relevant regulatory authority.',
          onclick: `caseAction('${c.id}', 'file-sar')`
        } : {
          icon: 'fa-download', color: 'emerald', label: 'Download SAR Report', btnLabel: 'Download',
          desc: `SAR ${c.sar_number} has been filed. Download the full regulatory report.`,
          onclick: `downloadSAR('${c.id}')`
        },
        {
          icon: 'fa-user-plus', color: 'blue', label: 'Assign to Analyst', btnLabel: 'Assign',
          desc: 'Assign this case to a compliance analyst for ownership and follow-up.',
          onclick: `promptAssign('${c.id}')`
        },
        {
          icon: 'fa-pen-to-square', color: 'purple', label: 'Add Investigation Findings', btnLabel: 'Add Findings',
          desc: 'Record findings, observations, or evidence gathered during review.',
          onclick: `promptFindings('${c.id}')`
        },
      ].filter(Boolean);

      const colorMap = {
        yellow:  { bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: 'text-yellow-500',  btn: 'bg-yellow-500 hover:bg-yellow-600' },
        orange:  { bg: 'bg-orange-50',  border: 'border-orange-200', icon: 'text-orange-500',  btn: 'bg-orange-500 hover:bg-orange-600' },
        green:   { bg: 'bg-green-50',   border: 'border-green-200',  icon: 'text-green-600',   btn: 'bg-green-600 hover:bg-green-700' },
        red:     { bg: 'bg-red-50',     border: 'border-red-200',    icon: 'text-red-500',     btn: 'bg-red-500 hover:bg-red-600' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200',icon: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
        blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',   icon: 'text-blue-500',    btn: 'bg-blue-500 hover:bg-blue-600' },
        purple:  { bg: 'bg-purple-50',  border: 'border-purple-200', icon: 'text-purple-500',  btn: 'bg-purple-500 hover:bg-purple-600' },
      };

      actionsDiv.innerHTML = `
        <p class="text-xs text-gray-400 mb-4">Select an action to perform on case <span class="font-semibold text-gray-600">${c.case_number}</span>:</p>
        <div class="space-y-3">
          ${actions.map(a => {
            const cl = colorMap[a.color];
            return `<div class="flex items-center gap-4 p-4 rounded-xl border ${cl.bg} ${cl.border} hover:shadow-md transition group">
              <div class="w-10 h-10 rounded-xl ${cl.bg} border ${cl.border} flex items-center justify-center shrink-0">
                <i class="fas ${a.icon} ${cl.icon} text-base"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800">${a.label}</p>
                <p class="text-xs text-gray-500 mt-0.5">${a.desc}</p>
              </div>
              <button onclick="${a.onclick}" class="shrink-0 px-4 py-2 rounded-xl text-white text-xs font-semibold ${cl.btn} transition shadow-sm">
                ${a.btnLabel}
              </button>
            </div>`;
          }).join('')}
        </div>
      `;
    }

    // Reset to Details tab and open modal
    switchCaseTab('details');
    document.getElementById('caseModal').classList.remove('hidden');
    const scroll = document.getElementById('caseModalScroll');
    if (scroll) scroll.scrollTop = 0;

  } catch (e) { alert('Error loading case: ' + e.message); }
}

function closeCaseModal() {
  document.getElementById('caseModal').classList.add('hidden');
  _openCaseId = null;
}

async function caseAction(caseId, action) {
  try {
    if (action === 'escalate') {
      await apiFetch(`/api/compliance/cases/${caseId}/escalate`, { method: 'POST' });
    } else if (action === 'file-sar') {
      await apiFetch(`/api/compliance/cases/${caseId}/file-sar`, { method: 'POST' });
    } else if (action === 'investigate') {
      await apiFetch(`/api/compliance/cases/${caseId}`, { method: 'PUT', body: JSON.stringify({ status: 'investigating' }) });
    } else if (action === 'resolve') {
      showResolveModal(caseId);
      return;
    }
    closeCaseModal();
    loadCases();
  } catch (e) { alert('Action error: ' + e.message); }
}

const CASE_ASSIGNEES = ['Mohamad', 'Walid', 'Rohit', 'Vibin', 'Sriram'];

function promptAssign(caseId) {
  showAssignModal(caseId);
}

function showAssignModal(caseId, currentAssignee) {
  document.getElementById('assignModal')?.remove();
  const opts = CASE_ASSIGNEES.map(n => `<option value="${n}"${n === currentAssignee ? ' selected' : ''}>${n}</option>`).join('');
  const modal = document.createElement('div');
  modal.id = 'assignModal';
  modal.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-black/50';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl p-6 w-80">
      <h3 class="text-sm font-semibold text-gray-800 mb-4"><i class="fas fa-user-plus mr-2 text-blue-500"></i>Assign Case</h3>
      <label class="block text-xs text-gray-500 mb-1">Assignee</label>
      <select id="assigneeSelect" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-4">
        <option value="">— Select assignee —</option>
        ${opts}
      </select>
      <div class="flex gap-2">
        <button onclick="submitAssign('${caseId}')" class="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">Assign</button>
        <button onclick="document.getElementById('assignModal').remove()" class="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function submitAssign(caseId) {
  const assignee = document.getElementById('assigneeSelect').value;
  if (!assignee) { alert('Please select an assignee.'); return; }
  try {
    await apiFetch(`/api/compliance/cases/${caseId}`, { method: 'PUT', body: JSON.stringify({ assigned_to: assignee }) });
    document.getElementById('assignModal').remove();
    closeCaseModal();
    loadCases();
  } catch (e) { alert('Error: ' + e.message); }
}

function showResolveModal(caseId) {
  document.getElementById('resolveModal')?.remove();
  const opts = CASE_ASSIGNEES.map(n => `<option value="${n}">${n}</option>`).join('');
  const modal = document.createElement('div');
  modal.id = 'resolveModal';
  modal.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-black/50';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl p-6 w-96">
      <h3 class="text-sm font-semibold text-gray-800 mb-4"><i class="fas fa-check-circle mr-2 text-green-500"></i>Resolve Case</h3>
      <div id="resolveError" class="hidden mb-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2"></div>
      <label class="block text-xs text-gray-500 mb-1">Assignee <span class="text-red-400">*</span></label>
      <select id="resolveAssignee" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-3">
        <option value="">— Select assignee —</option>
        ${opts}
      </select>
      <label class="block text-xs text-gray-500 mb-1">Resolution Notes <span class="text-red-400">*</span></label>
      <textarea id="resolveNotes" rows="3" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-4 resize-none" placeholder="Describe the resolution…"></textarea>
      <div class="flex gap-2">
        <button onclick="submitResolve('${caseId}')" class="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-500">Mark Resolved</button>
        <button onclick="document.getElementById('resolveModal').remove()" class="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function submitResolve(caseId) {
  const assignee = document.getElementById('resolveAssignee').value;
  const resolution = document.getElementById('resolveNotes').value.trim();
  const errDiv = document.getElementById('resolveError');
  if (!assignee) { errDiv.textContent = 'An assignee is required before resolving a case.'; errDiv.classList.remove('hidden'); return; }
  if (!resolution) { errDiv.textContent = 'Resolution notes are required.'; errDiv.classList.remove('hidden'); return; }
  try {
    await apiFetch(`/api/compliance/cases/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'resolved', assigned_to: assignee, resolution })
    });
    document.getElementById('resolveModal').remove();
    closeCaseModal();
    loadCases();
    if (ROLE === 'admin' || ROLE === 'operator') {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in';
      toast.innerHTML = '<i class="fas fa-check-circle"></i> Case resolved — redirecting to Approvals…';
      document.body.appendChild(toast);
      setTimeout(() => { toast.remove(); switchTab('approvals'); loadHITL(); }, 1400);
    }
  } catch (e) {
    errDiv.textContent = e.message || 'Failed to resolve case.';
    errDiv.classList.remove('hidden');
  }
}

function promptFindings(caseId) {
  const findings = prompt('Enter findings:');
  if (!findings) return;
  apiFetch(`/api/compliance/cases/${caseId}`, { method: 'PUT', body: JSON.stringify({ findings }) })
    .then(() => { closeCaseModal(); loadCases(); }).catch(e => alert('Error: ' + e.message));
}

async function downloadSAR(caseId) {
  try {
    const resp = await fetch('/api/compliance/cases/' + caseId + '/sar-report', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') } });
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'SAR_Report_' + caseId.substring(0,8) + '.json';
    a.click(); URL.revokeObjectURL(url);
  } catch(e) { alert('Failed to download SAR report'); }
}

function viewCaseFromApprovals(caseNumber) {
  switchTab('cases');
  const tryOpen = (attempts) => {
    const allCaseIds = window._loadedCases || [];
    const match = allCaseIds.find(c => c.case_number === caseNumber);
    if (match) {
      openCaseModal(match.id);
    } else if (attempts > 0) {
      setTimeout(() => tryOpen(attempts - 1), 400);
    }
  };
  loadCases().then(() => tryOpen(5));
}
