// tab-payments.js — Payments module for IPTS

async function loadPaymentForm() {
  document.getElementById('paySenderName').textContent = FULL_NAME;
  document.getElementById('paySenderBalance').textContent = '$' + Number(BALANCE).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const limits = { admin:{daily:10000000,per_tx:5000000}, operator:{daily:1000000,per_tx:500000}, client:{daily:1000000,per_tx:500000} };
  if (limits[ROLE]) showTxLimits(limits[ROLE]);
  try {
    const data = await apiFetch('/api/accounts/beneficiaries');
    BENEFICIARY_LIST = data.beneficiaries || [];
    const sel = document.getElementById('payBeneficiary');
    sel.innerHTML = '<option value="">Select beneficiary...</option>' +
      BENEFICIARY_LIST.map(b => {
        return `<option value="${b.name}" data-username="${b.username || ''}">${b.name} (${b.type})</option>`;
      }).join('');
  } catch (e) { console.error('Beneficiary load error:', e); }
  updateFXPreview();
}

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
        destination_country: document.getElementById('destCountry')?.value || '',
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
        ${result.risk_breakdown ? `
          <div class="bg-gray-100 rounded-lg p-3 text-xs">
            <p class="text-gray-500 mb-2">Score Breakdown</p>
            <div class="space-y-1">
              ${Object.entries(result.risk_breakdown).map(([k, v]) => `
                <div class="flex justify-between">
                  <span class="capitalize">${k}</span>
                  <span class="font-mono">${v.toFixed(1)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5">
                  <div class="h-1.5 rounded-full ${v > 60 ? 'bg-red-500' : v > 30 ? 'bg-yellow-500' : 'bg-green-500'}" style="width:${Math.min(v, 100)}%"></div>
                </div>
              `).join('')}
            </div>
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

// Payment Flow Visualization
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

  window.showPaymentFlow = function(phase, data) {
    const panel = document.getElementById('paymentFlowPanel');
    if (!panel) return;

    if (phase === 'start') {
      pfReset();
      panel.classList.remove('hidden');
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
      const riskScore = data && data.risk_score !== undefined ? data.risk_score.toFixed(1) : '—';
      pfActivateNode(1, 'Transfer initiated ✓', 'green');
      pfActivateNode(2, '⏳ Pending HITL  score: ' + riskScore, 'yellow');
      const badge = document.getElementById('flowStatusBadge');
      const icon  = document.getElementById('flowPanelIcon');
      const msg   = document.getElementById('flowProgressMsg');
      if (badge) { badge.textContent='AWAITING APPROVAL'; badge.className='text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'; }
      if (icon)  icon.textContent = '⏳';
      if (msg)   { msg.textContent='Payment held for compliance review — journey will resume once approved.'; msg.style.color='#fde68a'; }
      [3, 4, 5, 6].forEach(pfDimNode);
      return;
    }

    if (phase === 'hitl_approved') {
      const txHash = data && data.tx_hash ? data.tx_hash.slice(0,14) + '...' : 'confirmed';
      const uetr   = data && data.uetr    ? data.uetr.slice(0,13) + '...' : 'routed';
      panel.classList.remove('hidden');
      const payTab = document.querySelector('[data-tab="payments"]');
      if (payTab) payTab.click();
      pfTimeout(() => { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150);
      const badge = document.getElementById('flowStatusBadge');
      const icon  = document.getElementById('flowPanelIcon');
      const msg   = document.getElementById('flowProgressMsg');
      if (badge) { badge.textContent='APPROVED'; badge.className='text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/40'; }
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
        });
      }, 1600);
      return;
    }

    if (phase === 'blocked') {
      pfReset();
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
      return;
    }

    if (phase === 'complete') {
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
        });
      }, 750);
      return;
    }

    if (phase === 'error') {
      const msg = document.getElementById('flowProgressMsg');
      const badge = document.getElementById('flowStatusBadge');
      if (badge) { badge.textContent='ERROR'; badge.className='text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40'; }
      if (msg)   { msg.textContent='Network error — could not complete settlement.'; msg.style.color='#fca5a5'; }
      return;
    }
  };
})();

// FX Preview
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
    amlText.textContent = `Amount exceeds $100K — transaction will be flagged for AML review and routed to Human-in-the-Loop queue.`;
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

// Payment Sub-tabs
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
