// ============================================================
// tab-ledger.js — Real-time Ledger with Transaction Detail
// ============================================================

let _ledgerAllRows = [];
let _ledgerTxMap   = {};  // transaction_id → full tx data (lazy loaded)

// ── Main loader ──────────────────────────────────────────────
async function loadLedgerTab() {
  await loadLedgerEntries();
}

// ── Real-time Ledger ─────────────────────────────────────────
async function loadLedgerEntries() {
  const tbody = document.getElementById('ledgerBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading…</td></tr>';
  try {
    const data = await apiFetch('/api/ledger?limit=500');
    _ledgerAllRows = data.transactions || data.entries || [];

    // KPIs
    let totalDebit = 0, totalCredit = 0;
    _ledgerAllRows.forEach(e => {
      const amt = Math.abs(e.amount || 0);
      const dir = (e.direction || e.type || '').toLowerCase();
      if (dir === 'debit') totalDebit += amt;
      else totalCredit += amt;
    });
    const net = totalCredit - totalDebit;
    const fmt = v => '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const _set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    _set('ledgerKpiTotal',   _ledgerAllRows.length);
    _set('ledgerKpiDebits',  '-' + fmt(totalDebit));
    _set('ledgerKpiCredits', '+' + fmt(totalCredit));
    _set('ledgerKpiNet',     (net >= 0 ? '+' : '-') + fmt(net));

    filterLedger();
  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-red-400">Error: ${e.message}</td></tr>`;
    console.error('Ledger error:', e);
  }
}

function filterLedger() {
  const q    = (document.getElementById('ledgerSearch')?.value || '').toLowerCase();
  const type = (document.getElementById('ledgerTypeFilter')?.value || '').toLowerCase();

  const filtered = _ledgerAllRows.filter(e => {
    const dir = (e.direction || e.type || '').toLowerCase();
    if (type && dir !== type) return false;
    if (q) {
      const desc = e.counterparty || e.description || [e.sender_username, e.receiver_username].filter(Boolean).join(' → ');
      const hay = [desc, dir, e.created_at || '', e.id || '', e.currency || '', e.status || ''].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const tbody = document.getElementById('ledgerBody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">No entries match.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    const dir      = (e.direction || e.type || '').toLowerCase();
    const isDebit  = dir === 'debit';
    const amt      = Math.abs(e.amount || 0);
    const amtFmt   = (isDebit ? '-' : '+') + '$' + amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amtColor = isDebit ? 'text-red-500' : 'text-green-500';
    const typeCls  = isDebit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600';
    const date     = (e.created_at || e.date || '').slice(0, 16).replace('T', ' ');
    const desc     = e.counterparty || e.description || [e.sender_username, e.receiver_username].filter(Boolean).join(' → ') || '—';
    const balance  = e.balance !== undefined ? '$' + Number(e.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
    const txId     = e.id || '';
    const viewBtn  = txId
      ? `<button onclick="event.stopPropagation();openLedgerTxDetail('${txId}')" class="px-2 py-0.5 rounded-lg text-[10px] bg-accent/10 text-accent hover:bg-accent/20 font-semibold transition"><i class="fas fa-eye mr-1"></i>View</button>`
      : '<span class="text-gray-300 text-[10px]">—</span>';

    return `<tr class="border-b border-gray-100 hover:bg-cyan-50/30 transition cursor-pointer" onclick="openLedgerTxDetail('${txId}')">
      <td class="py-2 px-3 text-gray-400">${date}</td>
      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeCls}">${dir.toUpperCase()}</span></td>
      <td class="py-2 px-3 text-gray-700 max-w-[260px] truncate">${desc}</td>
      <td class="py-2 px-3 text-right font-bold ${amtColor}">${amtFmt}</td>
      <td class="py-2 px-3 text-right text-gray-600">${balance}</td>
      <td class="py-2 px-3 text-center">${viewBtn}</td>
    </tr>`;
  }).join('');
}

// ── Transaction Detail Modal ──────────────────────────────────
async function openLedgerTxDetail(txId) {
  if (!txId) return;

  const modal = document.getElementById('ledgerTxModal');
  const body  = document.getElementById('ledgerTxPanelBody');
  if (!modal || !body) return;

  modal.classList.remove('hidden');
  body.innerHTML = '<div class="text-center py-6 text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading details…</div>';

  const subtitle = document.getElementById('ledgerTxModalSubtitle');
  if (subtitle) subtitle.textContent = txId.slice(0, 16) + '…';

  try {
    // Try full transaction API first
    let tx = _ledgerTxMap[txId];
    if (!tx) {
      const res = await apiFetch(`/api/transactions/${txId}`).catch(() => null);
      tx = (res && (res.transaction || res.id)) ? (res.transaction || res) : null;
      if (tx) _ledgerTxMap[txId] = tx;
    }

    if (tx) {
      const subtitle = document.getElementById('ledgerTxModalSubtitle');
      if (subtitle) subtitle.textContent = (tx.tx_hash || txId).slice(0, 20) + '…';
      body.innerHTML = renderLedgerTxFull(tx);
    } else {
      // Fallback: use ledger row data
      const row = _ledgerAllRows.find(r => r.id === txId);
      if (row) {
        body.innerHTML = renderLedgerTxFallback(row);
      } else {
        body.innerHTML = '<p class="text-red-400 text-xs py-4 text-center">Transaction details not found.</p>';
      }
    }
  } catch (e) {
    body.innerHTML = `<p class="text-red-400 text-xs py-4 text-center">Error: ${e.message}</p>`;
  }
}

function renderLedgerTxFull(t) {
  const rs = t.risk_score || 0;
  const riskColor = rs >= 85 ? 'text-red-500' : rs >= 70 ? 'text-orange-500' : rs >= 40 ? 'text-yellow-600' : 'text-green-500';
  const statusCls = { settled: 'bg-green-100 text-green-700', approved: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', blocked: 'bg-red-100 text-red-600', flagged: 'bg-orange-100 text-orange-600' };
  const stc = statusCls[(t.status || '').toLowerCase()] || 'bg-gray-100 text-gray-500';
  const date = (t.created_at || '').slice(0, 16).replace('T', ' ');
  const sender = t.sender_username || t.sender || '—';
  const bene   = t.counterparty || t.beneficiary_name || t.receiver_username || t.receiver || '—';

  return `
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Date</p>
        <p class="font-semibold text-gray-700">${date || '—'}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Status</p>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${stc}">${t.status || '—'}</span>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Sender</p>
        <p class="font-semibold text-gray-700">${sender}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Counterparty</p>
        <p class="font-semibold text-gray-700">${bene}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Amount</p>
        <p class="font-bold text-gray-800 text-base">$${Number(t.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Risk Score</p>
        <p class="font-bold text-base ${riskColor}">${rs.toFixed(1)}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100 col-span-2">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tx Hash</p>
        <p class="font-mono text-gray-600 break-all text-[11px]">${t.tx_hash || '—'}</p>
      </div>
      ${t.currency ? `<div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Currency</p>
        <p class="font-semibold text-gray-700">${t.currency}</p>
      </div>` : ''}
      ${t.network ? `<div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Network</p>
        <p class="font-semibold text-gray-700">${t.network}</p>
      </div>` : ''}
      ${t.notes ? `<div class="bg-gray-50 rounded-lg p-3 border border-gray-100 col-span-2">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Notes</p>
        <p class="text-gray-600">${t.notes}</p>
      </div>` : ''}
    </div>
    <div class="mt-4 pt-3 border-t border-gray-100 flex gap-2">
      <button onclick="closeLedgerTxPanel();setTimeout(()=>{switchTab('aiml');setTimeout(()=>openTxShap('${t.id}'),400)},150)" class="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition">
        <i class="fas fa-brain mr-1.5"></i>View AI Risk Analysis
      </button>
    </div>
  `;
}

function renderLedgerTxFallback(row) {
  const isDebit = (row.type || '').toUpperCase() === 'DEBIT';
  const amt = Math.abs(row.amount || 0);
  const amtFmt = (isDebit ? '-' : '+') + '$' + amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = (row.date || row.created_at || '').slice(0, 16).replace('T', ' ');
  return `
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Date</p>
        <p class="font-semibold text-gray-700">${date}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Type</p>
        <p class="font-semibold text-gray-700">${row.type || '—'}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100 col-span-2">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Description</p>
        <p class="text-gray-700">${row.description || '—'}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Amount</p>
        <p class="font-bold text-base ${isDebit ? 'text-red-500' : 'text-green-500'}">${amtFmt}</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Balance After</p>
        <p class="font-semibold text-gray-700">${row.balance !== undefined ? '$' + Number(row.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</p>
      </div>
    </div>
  `;
}

function closeLedgerTxPanel() {
  const modal = document.getElementById('ledgerTxModal');
  if (modal) modal.classList.add('hidden');
}
