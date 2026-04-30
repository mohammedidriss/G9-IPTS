// ============================================================
// Payment Flow Visualization (IIFE assigns to window.showPaymentFlow)
// ============================================================
(function() {
  const _pfTimers = [];
  function pfTimeout(fn, ms) { const t = setTimeout(fn, ms); _pfTimers.push(t); return t; }

  const PF_NODES = [
    { id: 1, icon: '🏦', label: 'Sender Bank',      activeMsg: 'Initiating transfer',                dimMsg: 'Pending...' },
    { id: 2, icon: '🔐', label: 'AML Engine',        activeMsg: 'Risk scoring & compliance',           dimMsg: 'Awaiting...' },
    { id: 3, icon: '📋', label: 'ISO 20022',          activeMsg: 'Generating pacs.008 message',         dimMsg: 'Awaiting...' },
    { id: 4, icon: '⛓️', label: 'Blockchain',         activeMsg: 'Smart contract execution (Solidity)', dimMsg: 'Awaiting...' },
    { id: 5, icon: '🌐', label: 'SWIFT GPI',          activeMsg: 'Cross-network routing',               dimMsg: 'Awaiting...' },
    { id: 6, icon: '✅', label: 'Beneficiary',        activeMsg: 'Funds credited',                      dimMsg: 'Awaiting...' },
  ];

  function pfReset() {
    _pfTimers.forEach(clearTimeout);
    _pfTimers.length = 0;
    PF_NODES.forEach(n => {
      const circle = document.getElementById('flowCircle' + n.id);
      const detail = document.getElementById('flowDetail' + n.id);
      const label  = document.getElementById('flowLabel' + n.id);
      if (circle) { circle.style.borderColor=''; circle.style.backgroundColor=''; circle.style.boxShadow=''; circle.style.opacity='1'; circle.textContent = n.icon; }
      if (detail) { detail.textContent = n.dimMsg; detail.style.color = ''; }
      if (label)  { label.style.color = ''; }
      const line = document.getElementById('flowLine' + n.id);
      const dot  = document.getElementById('flowDot' + n.id);
      if (line) { line.style.width='0'; line.style.backgroundColor='#60a5fa'; }
      if (dot)  { dot.classList.add('hidden'); dot.style.opacity='0'; dot.style.backgroundColor='#60a5fa'; }
    });
    const badge = document.getElementById('flowStatusBadge');
    const icon  = document.getElementById('flowPanelIcon');
    const msg   = document.getElementById('flowProgressMsg');
    if (badge) { badge.textContent='Initiating...'; badge.className='text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40'; }
    if (icon)  icon.textContent = '💸';
    if (msg)   { msg.textContent='Connecting to banking network...'; msg.style.color='#93c5fd'; }
  }

  function pfActivateNode(nodeId, detailText, colorClass) {
    const circle = document.getElementById('flowCircle' + nodeId);
    const detail = document.getElementById('flowDetail' + nodeId);
    const label  = document.getElementById('flowLabel' + nodeId);
    if (!circle) return;
    const colors = {
      blue:   { border:'#60a5fa', bg:'rgba(59,130,246,0.25)', shadow:'0 0 14px #3b82f6, 0 0 4px #60a5fa', text:'#93c5fd' },
      green:  { border:'#22c55e', bg:'rgba(34,197,94,0.20)',  shadow:'0 0 14px #16a34a, 0 0 4px #22c55e', text:'#86efac' },
      red:    { border:'#ef4444', bg:'rgba(239,68,68,0.20)',  shadow:'0 0 14px #dc2626, 0 0 4px #ef4444', text:'#fca5a5' },
      yellow: { border:'#f59e0b', bg:'rgba(245,158,11,0.20)', shadow:'0 0 14px #d97706, 0 0 4px #f59e0b', text:'#fde68a' },
    };
    const c = colors[colorClass] || colors.blue;
    circle.style.borderColor     = c.border;
    circle.style.backgroundColor = c.bg;
    circle.style.boxShadow       = c.shadow;
    if (detail) { detail.textContent = detailText || ''; detail.style.color = c.text; }
    if (label)  { label.style.color  = c.text; }
  }

  function pfDimNode(nodeId) {
    const circle = document.getElementById('flowCircle' + nodeId);
    const detail = document.getElementById('flowDetail' + nodeId);
    const label  = document.getElementById('flowLabel' + nodeId);
    if (circle) { circle.style.opacity='0.35'; circle.style.boxShadow='none'; }
    if (detail) { detail.style.color='#4b5563'; }
    if (label)  { label.style.color='#4b5563'; }
  }

  function pfAnimateConnector(lineId, dotId, color, cb) {
    const line = document.getElementById(lineId);
    const dot  = document.getElementById(dotId);
    if (!line) { if (cb) cb(); return; }
    line.style.backgroundColor = color || '#60a5fa';
    line.style.width = '0';
    dot.style.backgroundColor = color || '#60a5fa';
    dot.style.boxShadow = '0 0 8px ' + (color || '#60a5fa');
    dot.classList.remove('hidden');
    dot.style.opacity = '1';
    dot.style.left = '0px';

    const totalWidth = line.parentElement.offsetWidth || 80;
    const duration = 400;
    const steps = 30;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const pct = step / steps;
      line.style.width = (pct * 100) + '%';
      dot.style.left = (pct * totalWidth - 6) + 'px';
      if (step >= steps) {
        clearInterval(interval);
        setTimeout(() => { dot.style.opacity='0'; }, 200);
        if (cb) cb();
      }
    }, duration / steps);
  }

  // Helper: open/close the global overlay
  function pfOpenOverlay() {
    const overlay = document.getElementById('paymentFlowOverlay');
    if (overlay) overlay.classList.remove('hidden');
  }
  function pfCloseOverlay() {
    const overlay = document.getElementById('paymentFlowOverlay');
    if (overlay) overlay.classList.add('hidden');
  }
  window.closePaymentFlowModal = function() {
    pfCloseOverlay();
    // Cancel any pending flow tracking so SSE doesn't re-open the modal
    window._pendingFlowHitlId = null;
    // Clear running timers so no stale animations fire after close
    _pfTimers.forEach(clearTimeout);
    _pfTimers.length = 0;
  };

  window.showPaymentFlow = function(phase, data) {
    const panel = document.getElementById('paymentFlowPanel');
    if (!panel) return;
    const closeBtn = document.getElementById('flowCloseBtn');

    if (phase === 'start') {
      pfReset();
      pfOpenOverlay();
      if (closeBtn) closeBtn.classList.add('hidden');
      pfActivateNode(1, 'Initiating transfer', 'blue');
      document.getElementById('flowProgressMsg').textContent = 'Step 1/6 — Connecting to Sender Bank...';
      pfTimeout(() => {
        pfAnimateConnector('flowLine1', 'flowDot1', '#60a5fa', () => {
          pfActivateNode(2, 'Risk scoring & compliance check', 'blue');
          document.getElementById('flowProgressMsg').textContent = 'Step 2/6 — AML engine analysing transaction...';
        });
      }, 400);
      pfTimeout(() => {
        pfAnimateConnector('flowLine2', 'flowDot2', '#60a5fa', () => {
          pfActivateNode(3, 'Generating pacs.008 message', 'blue');
          document.getElementById('flowProgressMsg').textContent = 'Step 3/6 — Building ISO 20022 message...';
        });
      }, 800);
      pfTimeout(() => {
        pfAnimateConnector('flowLine3', 'flowDot3', '#60a5fa', () => {
          pfActivateNode(4, 'Smart contract execution (Solidity)', 'blue');
          document.getElementById('flowProgressMsg').textContent = 'Step 4/6 — Awaiting blockchain confirmation...';
        });
      }, 1200);
      return;
    }

    if (phase === 'hitl_pending') {
      pfReset();
      pfOpenOverlay();
      // Close button visible immediately — user can dismiss while waiting for approval
      if (closeBtn) closeBtn.classList.remove('hidden');
      const riskScore = data && data.risk_score !== undefined ? data.risk_score.toFixed(1) : '—';
      pfActivateNode(1, 'Transfer initiated ✓', 'green');
      pfActivateNode(2, '⏳ Pending HITL  score: ' + riskScore, 'yellow');
      const badge = document.getElementById('flowStatusBadge');
      const icon  = document.getElementById('flowPanelIcon');
      const msg   = document.getElementById('flowProgressMsg');
      if (badge) { badge.textContent='AWAITING APPROVAL'; badge.className='text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'; }
      if (icon)  icon.textContent = '⏳';
      if (msg)   { msg.textContent='Payment held for compliance review — click × to dismiss. You will be notified when approved.'; msg.style.color='#fde68a'; }
      [3, 4, 5, 6].forEach(pfDimNode);
      return;
    }

    if (phase === 'hitl_approved') {
      const txHash = data && data.tx_hash ? data.tx_hash.slice(0,14) + '...' : 'confirmed';
      const uetr   = data && data.uetr    ? data.uetr.slice(0,13) + '...' : 'routed';
      pfReset();          // clear any stale state / timers before re-animating
      pfOpenOverlay();
      if (closeBtn) closeBtn.classList.add('hidden');

      const badge = document.getElementById('flowStatusBadge');
      const icon  = document.getElementById('flowPanelIcon');
      const msg   = document.getElementById('flowProgressMsg');
      if (badge) { badge.textContent='APPROVED — RESUMING'; badge.className='text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/40'; }
      if (icon)  icon.textContent = '✅';

      pfActivateNode(1, 'Transfer initiated ✓', 'green');
      pfActivateNode(2, '✅ Approved by compliance', 'green');
      ['flowLine1','flowLine2'].forEach(id => { const el=document.getElementById(id); if(el) el.style.backgroundColor='#22c55e'; });

      if (msg) { msg.textContent = 'HITL approval received — resuming payment journey...'; msg.style.color='#86efac'; }

      pfTimeout(() => {
        pfActivateNode(3, 'pacs.008 generated ✓', 'green');
        pfAnimateConnector('flowLine2', 'flowDot2', '#22c55e', () => {});
      }, 200);
      pfTimeout(() => {
        pfAnimateConnector('flowLine3', 'flowDot3', '#22c55e', () => {
          pfActivateNode(4, 'tx: ' + txHash, 'green');
          if (msg) msg.textContent = 'Step 4/6 — Blockchain transaction confirmed...';
        });
      }, 600);
      pfTimeout(() => {
        pfAnimateConnector('flowLine4', 'flowDot4', '#22c55e', () => {
          pfActivateNode(5, 'UETR: ' + uetr, 'green');
          if (msg) msg.textContent = 'Step 5/6 — SWIFT GPI routing payment...';
        });
      }, 1100);
      pfTimeout(() => {
        pfAnimateConnector('flowLine5', 'flowDot5', '#22c55e', () => {
          pfActivateNode(6, '🎉 Funds credited!', 'green');
          if (badge) { badge.textContent='COMPLETED'; badge.className='text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/40'; }
          if (msg)   { msg.textContent='Payment journey complete — funds successfully transferred after compliance approval.'; msg.style.color='#86efac'; }
          if (closeBtn) closeBtn.classList.remove('hidden');
        });
      }, 1600);
      return;
    }

    if (phase === 'blocked') {
      pfReset();
      pfOpenOverlay();
      const riskScore = data && data.risk_score !== undefined ? data.risk_score.toFixed(1) : '—';
      pfActivateNode(1, 'Transfer initiated ✓', 'green');
      pfActivateNode(2, '❌ BLOCKED  score: ' + riskScore, 'red');
      const badge = document.getElementById('flowStatusBadge');
      const icon  = document.getElementById('flowPanelIcon');
      const msg   = document.getElementById('flowProgressMsg');
      if (badge) { badge.textContent='BLOCKED'; badge.className='text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40'; }
      if (icon)  icon.textContent = '🚫';
      if (msg)   { msg.textContent='Transaction blocked by AML Engine — funds not transferred.'; msg.style.color='#fca5a5'; }
      [3, 4, 5, 6].forEach(pfDimNode);
      if (closeBtn) closeBtn.classList.remove('hidden');
      return;
    }

    if (phase === 'complete') {
      pfOpenOverlay();
      if (closeBtn) closeBtn.classList.add('hidden');
      const riskScore = data && data.risk_score !== undefined ? data.risk_score.toFixed(1) : '—';
      const txHash    = data && data.tx_hash ? data.tx_hash.slice(0,14) + '...' : 'confirmed';
      const uetr      = data && data.uetr    ? data.uetr.slice(0,13) + '...' : 'routed';

      pfActivateNode(2, 'Score: ' + riskScore + ' ✓', 'green');
      pfActivateNode(3, 'pacs.008 generated ✓', 'green');

      pfTimeout(() => {
        pfActivateNode(4, 'tx: ' + txHash, 'green');
        pfAnimateConnector('flowLine3', 'flowDot3', '#22c55e', () => {});
      }, 50);
      pfTimeout(() => {
        pfAnimateConnector('flowLine4', 'flowDot4', '#22c55e', () => {
          pfActivateNode(5, 'UETR: ' + uetr, 'green');
          document.getElementById('flowProgressMsg').textContent = 'Step 5/6 — SWIFT GPI routing payment...';
        });
      }, 350);
      pfTimeout(() => {
        pfAnimateConnector('flowLine5', 'flowDot5', '#22c55e', () => {
          pfActivateNode(6, '🎉 Funds credited!', 'green');
          const badge = document.getElementById('flowStatusBadge');
          const icon  = document.getElementById('flowPanelIcon');
          const msg   = document.getElementById('flowProgressMsg');
          if (badge) { badge.textContent='COMPLETED'; badge.className='text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/40'; }
          if (icon)  icon.textContent = '✅';
          if (msg)   { msg.textContent='Payment journey complete — funds successfully transferred.'; msg.style.color='#86efac'; }
          ['flowLine1','flowLine2'].forEach(id => { const el=document.getElementById(id); if(el) el.style.backgroundColor='#22c55e'; });
          if (closeBtn) closeBtn.classList.remove('hidden');
        });
      }, 750);
      return;
    }

    if (phase === 'error') {
      pfOpenOverlay();
      if (closeBtn) closeBtn.classList.remove('hidden');
      const msg = document.getElementById('flowProgressMsg');
      const badge = document.getElementById('flowStatusBadge');
      if (badge) { badge.textContent='ERROR'; badge.className='text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40'; }
      if (msg)   { msg.textContent='Network error — could not complete settlement.'; msg.style.color='#fca5a5'; }
      return;
    }
  };
})();

// ============================================================
// Settlement Execution
// ============================================================
async function executeSettlement() {
  const btn = document.getElementById('payBtn');
  const errDiv = document.getElementById('payError');
  errDiv.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

  const beneficiaryName = document.getElementById('payBeneficiary').value;
  const amount = parseFloat(document.getElementById('payAmount').value);

  if (!beneficiaryName) {
    errDiv.textContent = 'Please select a beneficiary.';
    errDiv.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-bolt mr-2"></i>Execute Settlement';
    return;
  }
  if (!amount || amount <= 0) {
    errDiv.textContent = 'Please enter a valid amount.';
    errDiv.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-bolt mr-2"></i>Execute Settlement';
    return;
  }
  if (amount > BALANCE) {
    errDiv.textContent = `Insufficient funds. Your balance is $${Number(BALANCE).toLocaleString('en-US', {minimumFractionDigits: 2})}.`;
    errDiv.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-bolt mr-2"></i>Execute Settlement';
    return;
  }

  const selectedOpt = document.getElementById('payBeneficiary').selectedOptions[0];
  const receiverUsername = selectedOpt ? selectedOpt.dataset.username : '';

  const confirmed = confirm(`Are you sure you want to execute this settlement for $${Number(amount).toLocaleString('en-US', {minimumFractionDigits: 2})} to ${beneficiaryName}?`);
  if (!confirmed) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-bolt mr-2"></i>Execute Settlement';
    return;
  }

  showPaymentFlow('start');

  try {
    const currency = document.getElementById('payCurrency').value || 'USD';
    const result = await apiFetch('/api/settlement', {
      method: 'POST',
      body: JSON.stringify({
        beneficiary_name:    beneficiaryName,
        amount:              amount,
        currency:            currency,
        receiver_username:   receiverUsername,
        confirmed:           true,
        originator_name:     document.getElementById('originatorName')?.value || '',
        originator_account:  document.getElementById('originatorAccount')?.value || '',
        beneficiary_account: document.getElementById('beneficiaryAccount')?.value || '',
        dest_country: document.getElementById('destCountry')?.value || '',
        payment_type:        currency !== 'USD' ? 'fx' : 'standard',
      })
    });

    if (result.new_balance !== undefined) {
      BALANCE = result.new_balance;
      localStorage.setItem('ipts_balance', BALANCE.toString());
      updateHeaderInfo();
      document.getElementById('paySenderBalance').textContent = '$' + Number(BALANCE).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    fetchAccountInfo();

    if (result.status === 'blocked' || result.risk_decision === 'blocked') {
      if (result.hitl_id) {
        window._pendingFlowHitlId = result.hitl_id;
        showPaymentFlow('hitl_pending', result);
      } else {
        showPaymentFlow('blocked', result);
      }
    } else {
      showPaymentFlow('complete', result);
    }

    const statusColor = result.status === 'blocked' ? 'red' : result.status === 'flagged' ? 'yellow' : 'green';
    const resultDiv = document.getElementById('payResult');
    resultDiv.innerHTML = `
      <div class="space-y-3 fade-in">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-3 h-3 rounded-full bg-${statusColor}-500"></span>
          <span class="text-lg font-bold status-${result.risk_decision || result.status}">${(result.status || '').toUpperCase()}</span>
          ${result.case_number ? `<span class="text-xs text-red-400 ml-2"><i class="fas fa-folder-open mr-1"></i>${result.case_number}</span>` : ''}
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="bg-gray-100 rounded-lg p-3">
            <p class="text-gray-500">Risk Score</p>
            <p class="text-xl font-bold ${result.risk_score >= 80 ? 'text-red-400' : result.risk_score >= 60 ? 'text-yellow-400' : 'text-green-400'}">${(result.risk_score || 0).toFixed(1)}</p>
          </div>
          <div class="bg-gray-100 rounded-lg p-3">
            <p class="text-gray-500">Settlement Time</p>
            <p class="text-xl font-bold text-accent">${result.settlement_time_ms || 'N/A'}ms</p>
          </div>
        </div>
        ${result.fee ? `<div class="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">
          <p class="text-blue-600 font-semibold mb-1"><i class="fas fa-receipt mr-1"></i>Fee Breakdown</p>
          <div class="flex justify-between"><span class="text-gray-500">Base fee (${result.fee.rate_pct}%)</span><span>$${result.fee.base_fee.toFixed(2)}</span></div>
          ${result.fee.swift_fee ? `<div class="flex justify-between"><span class="text-gray-500">SWIFT/Wire fee</span><span>$${result.fee.swift_fee.toFixed(2)}</span></div>` : ''}
          ${result.fee.fx_fee ? `<div class="flex justify-between"><span class="text-gray-500">FX conversion fee</span><span>$${result.fee.fx_fee.toFixed(2)}</span></div>` : ''}
          <div class="flex justify-between font-semibold border-t border-blue-100 pt-1 mt-1"><span>Total fee</span><span class="text-blue-600">$${result.fee.total_fee.toFixed(2)}</span></div>
        </div>` : ''}
        ${result.tx_hash ? `<div class="bg-gray-100 rounded-lg p-3 text-xs"><p class="text-gray-500">Transaction Hash</p><p class="font-mono text-accent break-all">${result.tx_hash}</p></div>` : ''}
        ${result.uetr ? `<div class="bg-gray-100 rounded-lg p-3 text-xs"><p class="text-gray-500">SWIFT GPI UETR</p><p class="font-mono text-blue-400">${result.uetr}</p></div>` : ''}
        ${result.risk_reasons && result.risk_reasons.length > 0 ? `
          <div class="bg-gray-100 rounded-lg p-3 text-xs">
            <p class="text-gray-500 mb-1">Risk Reasons</p>
            <ul class="list-disc list-inside text-yellow-400 space-y-1">
              ${result.risk_reasons.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>` : ''}
        ${result.shap_values ? `
          <div class="bg-gray-100 rounded-lg p-3 text-xs">
            <p class="text-gray-500 mb-2"><i class="fas fa-lightbulb text-yellow-400 mr-1"></i>SHAP Feature Contributions</p>
            <div class="space-y-1">
              ${Object.entries(result.shap_values).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).map(([k, v]) => `
                <div class="flex justify-between">
                  <span class="capitalize">${k}</span>
                  <span class="font-mono ${v > 0 ? 'text-red-400' : 'text-green-400'}">${v > 0 ? '+' : ''}${v.toFixed(4)}</span>
                </div>
              `).join('')}
            </div>
            <p class="text-gray-600 mt-2">View full chart in the AI/ML tab</p>
          </div>` : ''}
      </div>`;

    if (result.shap_values) {
      lastShapValues = result.shap_values;
    }

    pushChartData(result.status);
    loadDashboard();
  } catch (e) {
    showPaymentFlow('error');
    if (e.data && e.data.error === 'Insufficient funds') {
      errDiv.textContent = `Insufficient funds. Your balance is $${Number(e.data.current_balance).toLocaleString('en-US', {minimumFractionDigits: 2})}.`;
      errDiv.classList.remove('hidden');
    } else {
      document.getElementById('payResult').innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`;
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-bolt mr-2"></i>Execute Settlement';
  }
}

// ============================================================
// Payment Sub-tabs
// ============================================================
let currentExtType = 'ach';

function switchPaySub(sub) {
  document.querySelectorAll('.paysub-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.paysub-btn').forEach(el => { el.className = 'paysub-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-400 hover:text-gray-800 transition'; });
  document.getElementById('paysub-' + sub).classList.remove('hidden');
  const btn = document.querySelector(`[data-paysub="${sub}"]`);
  if (btn) btn.className = 'paysub-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white transition';
  if (sub === 'p2p') loadP2PHistory();
  if (sub === 'scheduled') loadScheduled();
}

async function sendP2P() {
  const errDiv = document.getElementById('p2pError'), sucDiv = document.getElementById('p2pSuccess');
  errDiv.classList.add('hidden'); sucDiv.classList.add('hidden');
  try {
    const result = await apiFetch('/api/p2p/send', { method: 'POST', body: JSON.stringify({
      recipient_type: document.getElementById('p2pType').value,
      recipient_value: document.getElementById('p2pRecipient').value,
      amount: parseFloat(document.getElementById('p2pAmount').value),
      note: document.getElementById('p2pNote').value,
    })});
    sucDiv.textContent = `$${result.new_balance !== undefined ? 'Sent! ' : ''}${result.recipient ? 'To ' + result.recipient : ''}`;
    sucDiv.classList.remove('hidden');
    BALANCE = result.new_balance || BALANCE; updateHeaderInfo(); fetchAccountInfo();
    loadP2PHistory();
  } catch (e) { errDiv.textContent = e.message; errDiv.classList.remove('hidden'); }
}

async function loadP2PHistory() {
  try {
    const data = await apiFetch('/api/p2p/history');
    const div = document.getElementById('p2pHistory');
    if (!data.transfers.length) { div.innerHTML = '<p class="text-gray-600 text-sm text-center py-8">No P2P transfers yet.</p>'; return; }
    div.innerHTML = data.transfers.map(t => `<div class="bg-gray-100 rounded-lg p-3 flex justify-between items-center">
      <div><p class="text-gray-800 text-sm">${t.recipient_username || t.recipient_value}</p><p class="text-gray-500 text-xs">${t.note || t.recipient_type} • ${new Date(t.created_at).toLocaleDateString()}</p></div>
      <span class="text-red-400 font-mono text-sm">-$${Number(t.amount).toLocaleString()}</span>
    </div>`).join('');
  } catch (e) { console.error(e); }
}

function selectExtType(type) {
  currentExtType = type;
  document.querySelectorAll('.ext-type-btn').forEach(el => { el.className = 'ext-type-btn px-3 py-3 rounded-lg bg-gray-100 text-gray-400 border border-gray-200 text-xs font-semibold text-center'; });
  const btn = document.getElementById('extType' + type.toUpperCase());
  if (btn) btn.className = 'ext-type-btn px-3 py-3 rounded-lg bg-accent/20 text-accent border border-accent text-xs font-semibold text-center';
  const fees = {ach: '$0.00', wire: '$25.00', sepa: '€5.00'};
  const times = {ach: '1-3 business days', wire: 'Same day', sepa: '1 business day'};
  document.getElementById('extFee').textContent = fees[type];
  document.getElementById('extProcessing').textContent = times[type];
}

async function sendExternal() {
  const errDiv = document.getElementById('extError'), sucDiv = document.getElementById('extSuccess');
  errDiv.classList.add('hidden'); sucDiv.classList.add('hidden');
  try {
    const result = await apiFetch('/api/transfers/external', { method: 'POST', body: JSON.stringify({
      transfer_type: currentExtType,
      recipient_name: document.getElementById('extName').value,
      routing_number: document.getElementById('extRouting').value,
      account_number: document.getElementById('extAccount').value,
      amount: parseFloat(document.getElementById('extAmount').value),
    })});
    sucDiv.innerHTML = `<i class="fas fa-check mr-1"></i>${currentExtType.toUpperCase()} transfer sent! Fee: $${result.fee}. Processing: ${result.processing_time}`;
    sucDiv.classList.remove('hidden');
    BALANCE = result.new_balance || BALANCE; updateHeaderInfo(); fetchAccountInfo();
  } catch (e) { errDiv.textContent = e.message; errDiv.classList.remove('hidden'); }
}

async function createScheduled() {
  try {
    await apiFetch('/api/payments/scheduled', { method: 'POST', body: JSON.stringify({
      beneficiary_name: document.getElementById('schedBen').value,
      amount: parseFloat(document.getElementById('schedAmount').value),
      frequency: document.getElementById('schedFreq').value,
      next_run_date: document.getElementById('schedDate').value,
      description: document.getElementById('schedDesc').value,
    })});
    loadScheduled();
  } catch (e) { alert(e.message); }
}

async function loadScheduled() {
  try {
    const data = await apiFetch('/api/payments/scheduled');
    const div = document.getElementById('scheduledList');
    if (!data.scheduled.length) { div.innerHTML = '<p class="text-gray-600 text-sm text-center py-8">No scheduled payments.</p>'; return; }
    div.innerHTML = data.scheduled.map(s => `<div class="bg-gray-100 rounded-lg p-3 flex justify-between items-center">
      <div><p class="text-gray-800 text-sm">${s.beneficiary_name}</p>
        <p class="text-gray-500 text-xs">${s.frequency} • Next: ${s.next_run_date || 'TBD'} ${s.description ? '• ' + s.description : ''}</p></div>
      <div class="flex items-center gap-2">
        <span class="text-accent font-mono text-sm">$${Number(s.amount).toLocaleString()}</span>
        <button onclick="deleteScheduled('${s.id}')" class="text-red-400 hover:text-red-300 text-xs"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
  } catch (e) { console.error(e); }
}

async function deleteScheduled(id) {
  if (!confirm('Cancel this scheduled payment?')) return;
  await apiFetch('/api/payments/scheduled/' + id, { method: 'DELETE' });
  loadScheduled();
}

async function generateQR() {
  try {
    const amount = parseFloat(document.getElementById('qrAmount').value) || 0;
    const result = await apiFetch('/api/qr/generate', { method: 'POST', body: JSON.stringify({ amount }) });
    document.getElementById('qrResult').innerHTML = `
      <div class="bg-white rounded-xl p-6 inline-block mb-3">
        <div style="width:150px;height:150px;background:#000;display:grid;grid-template-columns:repeat(10,1fr);gap:1px;padding:8px;" class="mx-auto rounded">
          ${Array.from({length:100}, () => `<div style="background:${Math.random()>0.5?'#000':'#fff'}"></div>`).join('')}
        </div>
      </div>
      <p class="text-gray-800 text-sm font-semibold">${FULL_NAME}</p>
      <p class="text-accent text-lg font-bold">${amount > 0 ? '$' + amount.toLocaleString() : 'Any amount'}</p>
      <p class="text-gray-500 text-xs mt-2 break-all font-mono">${result.qr_data.substring(0, 40)}...</p>
      <button onclick="navigator.clipboard.writeText('${result.qr_data}')" class="mt-2 text-xs text-accent hover:underline"><i class="fas fa-copy mr-1"></i>Copy QR Data</button>`;
  } catch (e) { console.error(e); }
}

async function payQR() {
  const errDiv = document.getElementById('qrPayError'), sucDiv = document.getElementById('qrPaySuccess');
  errDiv.classList.add('hidden'); sucDiv.classList.add('hidden');
  try {
    const result = await apiFetch('/api/qr/pay', { method: 'POST', body: JSON.stringify({
      qr_data: document.getElementById('qrScanData').value,
      amount: parseFloat(document.getElementById('qrPayAmount').value) || 0,
    })});
    sucDiv.textContent = `Paid $${result.new_balance ? '' : ''}to ${result.recipient}!`;
    sucDiv.classList.remove('hidden');
    BALANCE = result.new_balance || BALANCE; updateHeaderInfo(); fetchAccountInfo();
  } catch (e) { errDiv.textContent = e.message; errDiv.classList.remove('hidden'); }
}

// ============================================================
// Beneficiary Management
// ============================================================
async function loadBeneficiaries() {
  try {
    const data = await apiFetch('/api/beneficiaries');
    ALL_BENEFICIARIES = data.beneficiaries || [];
    renderBeneficiaries(ALL_BENEFICIARIES);
  } catch (e) { console.error('Load beneficiaries error:', e); }
}

function filterBeneficiaries() {
  const q = (document.getElementById('benSearch').value || '').toLowerCase();
  const filtered = ALL_BENEFICIARIES.filter(b =>
    b.name.toLowerCase().includes(q) ||
    (b.nickname || '').toLowerCase().includes(q) ||
    (b.bank_name || '').toLowerCase().includes(q) ||
    (b.country || '').toLowerCase().includes(q)
  );
  renderBeneficiaries(filtered);
}

function renderBeneficiaries(list) {
  document.getElementById('benCount').textContent = `${list.length} beneficiar${list.length === 1 ? 'y' : 'ies'}`;
  const tbody = document.getElementById('beneficiariesBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-600">No beneficiaries found.</td></tr>';
    return;
  }
  const countryFlags = {US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',FR:'🇫🇷',JP:'🇯🇵',CH:'🇨🇭',AU:'🇦🇺',CA:'🇨🇦',SG:'🇸🇬',AE:'🇦🇪',SA:'🇸🇦',IN:'🇮🇳',CN:'🇨🇳',BR:'🇧🇷',HK:'🇭🇰',KR:'🇰🇷',MX:'🇲🇽',NG:'🇳🇬',ZA:'🇿🇦'};
  tbody.innerHTML = list.map(b => {
    const flag = countryFlags[b.country] || '🌍';
    const typeIcon = b.beneficiary_type === 'corporate' ? 'fa-building' : b.beneficiary_type === 'trust' ? 'fa-landmark' : 'fa-user';
    const typeBadge = b.beneficiary_type === 'corporate' ? 'bg-blue-500/20 text-blue-400' : b.beneficiary_type === 'trust' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400';
    const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString() : '—';
    return `<tr class="border-b border-gray-100 hover:bg-gray-50 transition">
      <td class="py-3 pr-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-accent text-sm font-bold">${b.name.charAt(0).toUpperCase()}</div>
          <div>
            <p class="text-gray-800 font-medium">${b.name}</p>
            ${b.nickname ? `<p class="text-gray-500 text-xs">${b.nickname}</p>` : ''}
            ${b.account_number ? `<p class="text-gray-600 text-xs font-mono">${b.account_number.slice(0,4)}****${b.account_number.slice(-4)}</p>` : ''}
          </div>
        </div>
      </td>
      <td class="py-3 pr-3"><span class="badge ${typeBadge}"><i class="fas ${typeIcon} mr-1"></i>${b.beneficiary_type}</span></td>
      <td class="py-3 pr-3 text-gray-400">
        ${b.wallet_address
          ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium mb-1"><i class="fas fa-link text-xs"></i>On-Chain</span><br><span class="font-mono text-xs text-blue-500">${b.wallet_address.slice(0,10)}...</span>`
          : b.swift_code
            ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium mb-1"><i class="fas fa-exclamation-circle text-xs"></i>Legacy Fallback</span><br><span class="font-mono text-xs">${b.swift_code}</span>`
            : `<span class="text-xs text-gray-400">—</span>`
        }
        ${b.bank_name ? `<br><span class="text-xs text-gray-400">${b.bank_name}</span>` : ''}
      </td>
      <td class="py-3 pr-3">${flag} ${b.country}</td>
      <td class="py-3 pr-3"><span class="font-mono text-accent">${b.currency}</span></td>
      <td class="py-3 pr-3 text-gray-500">${dateStr}</td>
      <td class="py-3 text-right">
        <button onclick="editBeneficiary('${b.id}')" class="px-2 py-1 rounded text-blue-400 hover:bg-blue-500/10 transition" title="Edit"><i class="fas fa-pen text-xs"></i></button>
        <button onclick="deleteBeneficiary('${b.id}', '${b.name.replace(/'/g, "\\'")}')" class="px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition" title="Delete"><i class="fas fa-trash text-xs"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function addBeneficiary() {
  const errDiv = document.getElementById('benFormError');
  const sucDiv = document.getElementById('benFormSuccess');
  errDiv.classList.add('hidden');
  sucDiv.classList.add('hidden');

  const name = document.getElementById('benName').value.trim();
  if (!name) {
    errDiv.textContent = 'Beneficiary name is required.';
    errDiv.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('benAddBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding...';

  try {
    const result = await apiFetch('/api/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        nickname: document.getElementById('benNickname').value.trim(),
        account_number: document.getElementById('benAccount').value.trim(),
        bank_name: document.getElementById('benBank').value.trim(),
        swift_code: document.getElementById('benSwift').value.trim().toUpperCase() || null,
        wallet_address: document.getElementById('benWallet').value.trim() || null,
        country: document.getElementById('benCountry').value,
        currency: document.getElementById('benCurrency').value,
        beneficiary_type: document.getElementById('benType').value,
        notes: document.getElementById('benNotes').value.trim(),
      })
    });
    sucDiv.textContent = result.message || 'Beneficiary added successfully!';
    sucDiv.classList.remove('hidden');
    ['benName','benNickname','benAccount','benBank','benSwift','benWallet','benNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('benType').value = 'individual';
    document.getElementById('benCountry').value = 'US';
    document.getElementById('benCurrency').value = 'USD';
    loadBeneficiaries();
    setTimeout(() => sucDiv.classList.add('hidden'), 4000);
  } catch (e) {
    errDiv.textContent = e.message || 'Failed to add beneficiary.';
    errDiv.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus mr-2"></i>Add Beneficiary';
  }
}

function editBeneficiary(id) {
  const b = ALL_BENEFICIARIES.find(x => x.id === id);
  if (!b) return;
  document.getElementById('benName').value = b.name || '';
  document.getElementById('benNickname').value = b.nickname || '';
  document.getElementById('benAccount').value = b.account_number || '';
  document.getElementById('benBank').value = b.bank_name || '';
  document.getElementById('benSwift').value = b.swift_code || '';
  document.getElementById('benWallet').value = b.wallet_address || '';
  document.getElementById('benCountry').value = b.country || 'US';
  document.getElementById('benCurrency').value = b.currency || 'USD';
  document.getElementById('benType').value = b.beneficiary_type || 'individual';
  document.getElementById('benNotes').value = b.notes || '';
  const btn = document.getElementById('benAddBtn');
  btn.innerHTML = '<i class="fas fa-save mr-2"></i>Update Beneficiary';
  btn.onclick = async function() {
    const errDiv = document.getElementById('benFormError');
    const sucDiv = document.getElementById('benFormSuccess');
    errDiv.classList.add('hidden');
    sucDiv.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Updating...';
    try {
      const result = await apiFetch('/api/beneficiaries/' + id, {
        method: 'PUT',
        body: JSON.stringify({
          name: document.getElementById('benName').value.trim(),
          nickname: document.getElementById('benNickname').value.trim(),
          account_number: document.getElementById('benAccount').value.trim(),
          bank_name: document.getElementById('benBank').value.trim(),
          swift_code: document.getElementById('benSwift').value.trim().toUpperCase(),
          country: document.getElementById('benCountry').value,
          currency: document.getElementById('benCurrency').value,
          beneficiary_type: document.getElementById('benType').value,
          notes: document.getElementById('benNotes').value.trim(),
        })
      });
      sucDiv.textContent = 'Beneficiary updated!';
      sucDiv.classList.remove('hidden');
      ['benName','benNickname','benAccount','benBank','benSwift','benNotes'].forEach(fid => document.getElementById(fid).value = '');
      btn.innerHTML = '<i class="fas fa-plus mr-2"></i>Add Beneficiary';
      btn.onclick = addBeneficiary;
      loadBeneficiaries();
      setTimeout(() => sucDiv.classList.add('hidden'), 4000);
    } catch (e) {
      errDiv.textContent = e.message || 'Update failed.';
      errDiv.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  };
  document.getElementById('beneficiaryForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteBeneficiary(id, name) {
  if (!confirm(`Delete beneficiary "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch('/api/beneficiaries/' + id, { method: 'DELETE' });
    loadBeneficiaries();
  } catch (e) {
    alert('Delete failed: ' + (e.message || 'Unknown error'));
  }
}

// ============================================================
// Spending 360 Reporting
// ============================================================
let rptMonthlyChart = null;
let rptStatusChart = null;
let rptRiskChart = null;
let rptCurrencyChart = null;
let rptHourlyChart = null;
let rptDowChart = null;

async function loadSpending360() {
  try {
    const data = await apiFetch('/api/reporting/spending-360');
    renderSpendingKPIs(data);
    renderMonthlyTrend(data.monthly_trend || []);
    renderStatusChart(data.by_status || []);
    renderRiskChart(data.risk_distribution || {});
    renderCurrencyChart(data.by_currency || []);
    renderHourlyChart(data.hourly_pattern || []);
    renderDowChart(data.dow_pattern || []);
    renderTopBeneficiaries(data.by_beneficiary || []);
    renderRecentTransactions(data.recent_transactions || []);
  } catch (e) { console.error('Spending 360 error:', e); }
}

function renderSpendingKPIs(data) {
  const s = data.summary || {};
  document.getElementById('rptTotalSent').textContent = '$' + Number(s.total_sent_amount || 0).toLocaleString('en-US', {maximumFractionDigits: 0});
  document.getElementById('rptTotalSentCount').textContent = `${s.total_sent_count || 0} transactions`;
  document.getElementById('rptTotalRecv').textContent = '$' + Number(s.total_received_amount || 0).toLocaleString('en-US', {maximumFractionDigits: 0});
  document.getElementById('rptTotalRecvCount').textContent = `${s.total_received_count || 0} transactions`;
  document.getElementById('rptAvgRisk').textContent = (s.avg_risk_score || 0).toFixed(1);
  document.getElementById('rptBalance').textContent = '$' + Number(data.balance || 0).toLocaleString('en-US', {maximumFractionDigits: 0});
  if (data.highest_transaction) {
    document.getElementById('rptHighestTx').textContent = '$' + Number(data.highest_transaction.amount || 0).toLocaleString('en-US', {maximumFractionDigits: 0});
    document.getElementById('rptHighestBen').textContent = data.highest_transaction.beneficiary || '—';
  }
}

function makeChart(canvasId, config) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, config);
}

function renderMonthlyTrend(data) {
  if (rptMonthlyChart) rptMonthlyChart.destroy();
  rptMonthlyChart = makeChart('rptMonthlyChart', {
    type: 'line',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: 'Spending ($)',
        data: data.map(d => d.amount),
        borderColor: '#0D47A1',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#0D47A1',
        pointRadius: 4,
      }, {
        label: 'Tx Count',
        data: data.map(d => d.count),
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        yAxisID: 'y1',
        tension: 0.4,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#9ca3af', font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(42,63,85,0.3)' } },
        y: { ticks: { color: '#6b7280', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(42,63,85,0.3)' } },
        y1: { position: 'right', ticks: { color: '#6b7280' }, grid: { display: false } },
      }
    }
  });
}

function renderStatusChart(data) {
  if (rptStatusChart) rptStatusChart.destroy();
  const colors = { settled: '#0D47A1', blocked: '#ef4444', flagged: '#f59e0b', pending: '#8b5cf6' };
  rptStatusChart = makeChart('rptStatusChart', {
    type: 'doughnut',
    data: {
      labels: data.map(d => (d.status || 'unknown').toUpperCase()),
      datasets: [{ data: data.map(d => d.amount), backgroundColor: data.map(d => colors[d.status] || '#6b7280'), borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { position: 'right', labels: { color: '#9ca3af', padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: $${Number(ctx.raw).toLocaleString()}` } }
      }
    }
  });
}

function renderRiskChart(data) {
  if (rptRiskChart) rptRiskChart.destroy();
  rptRiskChart = makeChart('rptRiskChart', {
    type: 'bar',
    data: {
      labels: ['Low (<30)', 'Medium (30-60)', 'High (60-80)', 'Critical (80+)'],
      datasets: [{ data: [data.low || 0, data.medium || 0, data.high || 0, data.critical || 0], backgroundColor: ['#0D47A1', '#f59e0b', '#f97316', '#ef4444'], borderRadius: 6, barThickness: 40 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#6b7280', stepSize: 1 }, grid: { color: 'rgba(42,63,85,0.3)' } },
      }
    }
  });
}

function renderCurrencyChart(data) {
  if (rptCurrencyChart) rptCurrencyChart.destroy();
  const currColors = ['#0D47A1','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316','#84cc16','#6366f1','#14b8a6','#e11d48','#a855f7'];
  rptCurrencyChart = makeChart('rptCurrencyChart', {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.currency),
      datasets: [{ data: data.map(d => d.amount), backgroundColor: data.map((_, i) => currColors[i % currColors.length]), borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { color: '#9ca3af', padding: 10, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: $${Number(ctx.raw).toLocaleString()}` } }
      }
    }
  });
}

function renderHourlyChart(data) {
  if (rptHourlyChart) rptHourlyChart.destroy();
  const hours = Array.from({length: 24}, (_, i) => i);
  const hourMap = {};
  data.forEach(d => { hourMap[d.hour] = d; });
  rptHourlyChart = makeChart('rptHourlyChart', {
    type: 'bar',
    data: {
      labels: hours.map(h => `${h}:00`),
      datasets: [{
        label: 'Transactions',
        data: hours.map(h => (hourMap[h] || {}).count || 0),
        backgroundColor: hours.map(h => (hourMap[h] || {}).count ? 'rgba(16,185,129,0.6)' : 'rgba(42,63,85,0.3)'),
        borderRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 8 }, maxRotation: 0 }, grid: { display: false } },
        y: { ticks: { color: '#6b7280', stepSize: 1 }, grid: { color: 'rgba(42,63,85,0.3)' } },
      }
    }
  });
}

function renderDowChart(data) {
  if (rptDowChart) rptDowChart.destroy();
  const allDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayMap = {};
  data.forEach(d => { dayMap[d.day] = d; });
  rptDowChart = makeChart('rptDowChart', {
    type: 'bar',
    data: {
      labels: allDays,
      datasets: [{
        label: 'Amount ($)', data: allDays.map(d => (dayMap[d] || {}).amount || 0),
        backgroundColor: 'rgba(59,130,246,0.6)', borderRadius: 6, barThickness: 30,
      }, {
        label: 'Count', data: allDays.map(d => (dayMap[d] || {}).count || 0),
        backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 6, barThickness: 30, yAxisID: 'y1',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#9ca3af', font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#6b7280' }, grid: { display: false } },
        y: { ticks: { color: '#6b7280', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(42,63,85,0.3)' } },
        y1: { position: 'right', ticks: { color: '#6b7280' }, grid: { display: false } },
      }
    }
  });
}

function renderTopBeneficiaries(data) {
  const tbody = document.getElementById('rptBeneficiaryBody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-600">No transaction data yet.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((b, i) => {
    const riskColor = b.avg_risk >= 80 ? 'text-red-400' : b.avg_risk >= 60 ? 'text-orange-400' : b.avg_risk >= 30 ? 'text-yellow-400' : 'text-green-400';
    const riskLabel = b.avg_risk >= 80 ? 'CRITICAL' : b.avg_risk >= 60 ? 'HIGH' : b.avg_risk >= 30 ? 'MEDIUM' : 'LOW';
    const riskBg = b.avg_risk >= 80 ? 'severity-critical' : b.avg_risk >= 60 ? 'severity-high' : b.avg_risk >= 30 ? 'severity-medium' : 'severity-low';
    return `<tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="py-2.5 pr-3 text-gray-500">${i + 1}</td>
      <td class="py-2.5 pr-3 text-gray-800 font-medium">${b.name || 'Unknown'}</td>
      <td class="py-2.5 pr-3 text-right text-gray-400">${b.count}</td>
      <td class="py-2.5 pr-3 text-right text-gray-800 font-mono">$${Number(b.amount).toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
      <td class="py-2.5 pr-3 text-right ${riskColor} font-mono">${b.avg_risk}</td>
      <td class="py-2.5"><span class="badge ${riskBg}">${riskLabel}</span></td>
    </tr>`;
  }).join('');
}

function renderRecentTransactions(data) {
  const tbody = document.getElementById('rptRecentBody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-600">No transactions yet.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(tx => {
    const dateStr = tx.created_at ? new Date(tx.created_at).toLocaleString() : '—';
    const statusCls = 'status-' + (tx.status || 'pending');
    return `<tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="py-2.5 pr-3 text-gray-500">${dateStr}</td>
      <td class="py-2.5 pr-3 text-gray-800">${tx.beneficiary || '—'}</td>
      <td class="py-2.5 pr-3 text-right text-gray-800 font-mono">$${Number(tx.amount || 0).toLocaleString()}</td>
      <td class="py-2.5 pr-3 font-mono text-accent">${tx.currency || 'USD'}</td>
      <td class="py-2.5 pr-3 text-right font-mono ${(tx.risk_score||0) >= 60 ? 'text-red-400' : (tx.risk_score||0) >= 30 ? 'text-yellow-400' : 'text-green-400'}">${(tx.risk_score || 0).toFixed(1)}</td>
      <td class="py-2.5"><span class="badge ${statusCls}">${(tx.status || 'pending').toUpperCase()}</span></td>
    </tr>`;
  }).join('');
}
