// ============================================================
// MLOps Tab
// ============================================================
async function loadMLOps() {
  try {
    const data = await apiFetch('/api/models/metrics');
    const modelNames = { isolation_forest: 'Isolation Forest', random_forest: 'Random Forest', xgboost: 'XGBoost', autoencoder: 'Autoencoder', sequence_detector: 'Sequence Detector' };
    const modelIcons = { isolation_forest: 'fa-tree', random_forest: 'fa-trees', xgboost: 'fa-rocket', autoencoder: 'fa-network-wired', sequence_detector: 'fa-wave-square' };
    const modelColors = { isolation_forest: 'text-green-600', random_forest: 'text-blue-500', xgboost: 'text-purple-500', autoencoder: 'text-cyan-600', sequence_detector: 'text-orange-500' };
    const modelDesc = {
      isolation_forest: 'n_estimators=100, contamination=0.05',
      random_forest: 'n_estimators=150, max_depth=12, balanced',
      xgboost: 'n_estimators=200, max_depth=6, lr=0.05',
      autoencoder: 'MLP 64→32→16→32→64, relu, max_iter=200',
      sequence_detector: 'SGD modified_huber, online mini-batch'
    };

    const grid = document.getElementById('mlops-model-grid');
    const entries = Object.entries(data.models).filter(([k]) => modelNames[k]);
    grid.innerHTML = entries.map(([key, m]) => `
      <div class="glass rounded-xl p-5 border border-white/5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <i class="fas ${modelIcons[key] || 'fa-brain'} ${modelColors[key] || 'text-accent'}"></i>
          </div>
          <div>
            <div class="text-sm font-semibold text-gray-800">${modelNames[key] || key}</div>
            <div class="text-xs text-gray-500">${modelDesc[key] || ''}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-xs text-gray-500 mb-1">Accuracy</div>
            <div class="text-xl font-mono font-bold text-gray-800">${(m.accuracy * 100).toFixed(1)}%</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-xs text-gray-500 mb-1">F1 Score</div>
            <div class="text-xl font-mono font-bold ${modelColors[key] || 'text-accent'}">${(m.f1 * 100).toFixed(1)}%</div>
          </div>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-1.5">
          <div class="h-1.5 rounded-full bg-gradient-to-r from-accent to-purple-500" style="width:${(m.accuracy*100).toFixed(0)}%"></div>
        </div>
      </div>
    `).join('');

    try {
      const ins = await apiFetch('/api/models/insights');
      window._mlopsInsights = ins.insights || {};
      switchMLOpsChart('random_forest');
    } catch(_) {}
  } catch(e) { console.error('MLOps load error:', e); }
}

const _mlopsChartColors = {
  random_forest:    { bar: '#7c3aed', bg: 'rgba(124,58,237,0.15)' },
  xgboost:          { bar: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  isolation_forest: { bar: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  autoencoder:      { bar: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  sequence_detector:{ bar: '#f97316', bg: 'rgba(249,115,22,0.15)' },
};

function switchMLOpsChart(modelKey) {
  document.querySelectorAll('.mlops-chart-tab').forEach(btn => {
    if (btn.dataset.chart === modelKey) {
      btn.className = 'mlops-chart-tab px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white transition';
    } else {
      btn.className = 'mlops-chart-tab px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition';
    }
  });

  const insights = window._mlopsInsights || {};
  const data = insights[modelKey];
  const container = document.getElementById('mlops-feature-chart');
  const labelEl = document.getElementById('mlops-chart-label');

  if (!data) {
    container.innerHTML = '<p class="text-gray-400 text-sm py-4">No data yet — retrain this model to generate chart.</p>';
    if (labelEl) labelEl.textContent = '';
    return;
  }

  if (labelEl) labelEl.textContent = data.label || '';

  const feats = data.features || [];
  const vals = data.values || [];
  const color = _mlopsChartColors[modelKey] || { bar: '#7c3aed', bg: 'rgba(124,58,237,0.15)' };

  const paired = feats.map((f, i) => [f, vals[i]]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = paired[0]?.[1] || 1;

  const fmtVal = (v) => {
    if (data.type === 'feature_importance') return (v * 100).toFixed(1) + '%';
    if (data.type === 'coefficients') return v.toFixed(4);
    return v.toExponential(2);
  };

  container.innerHTML = paired.map(([feat, val], i) => `
    <div class="flex items-center gap-3 group">
      <div class="w-40 text-xs text-gray-500 text-right truncate" title="${feat}">${feat}</div>
      <div class="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
        <div class="h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
             style="width:${Math.max(4,(val/max*100)).toFixed(1)}%; background:${color.bar}">
        </div>
      </div>
      <div class="w-16 text-xs font-mono text-gray-600 text-right">${fmtVal(val)}</div>
    </div>
  `).join('');
}

function mlopsSelectAll(checked) {
  document.querySelectorAll('.mlops-chk').forEach(cb => cb.checked = checked);
}

async function refreshMLOpsMetrics() {
  const btn = document.getElementById('mlops-metrics-refresh-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing…';
  const grid = document.getElementById('mlops-model-grid');
  grid.innerHTML = '<div class="col-span-5 text-center text-gray-400 text-sm py-6"><i class="fas fa-spinner fa-spin mr-2"></i>Loading…</div>';
  try {
    const data = await apiFetch('/api/models/metrics');
    const modelNames = { isolation_forest: 'Isolation Forest', random_forest: 'Random Forest', xgboost: 'XGBoost', autoencoder: 'Autoencoder', sequence_detector: 'Sequence Detector' };
    const modelIcons = { isolation_forest: 'fa-tree', random_forest: 'fa-trees', xgboost: 'fa-rocket', autoencoder: 'fa-network-wired', sequence_detector: 'fa-wave-square' };
    const modelColors = { isolation_forest: 'text-green-600', random_forest: 'text-blue-500', xgboost: 'text-purple-500', autoencoder: 'text-cyan-600', sequence_detector: 'text-orange-500' };
    const modelDesc = { isolation_forest: 'n_estimators=100, contamination=0.05', random_forest: 'n_estimators=150, max_depth=12, balanced', xgboost: 'n_estimators=200, max_depth=6, lr=0.05', autoencoder: 'MLP 64→32→16→32→64, relu, max_iter=200', sequence_detector: 'SGD modified_huber, online mini-batch' };
    const entries = Object.entries(data.models).filter(([k]) => modelNames[k]);
    grid.innerHTML = entries.map(([key, m]) => `
      <div class="glass rounded-xl p-5 border border-white/5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <i class="fas ${modelIcons[key] || 'fa-brain'} ${modelColors[key] || 'text-accent'}"></i>
          </div>
          <div>
            <div class="text-sm font-semibold text-gray-800">${modelNames[key] || key}</div>
            <div class="text-xs text-gray-500">${modelDesc[key] || ''}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-xs text-gray-500 mb-1">Accuracy</div>
            <div class="text-xl font-mono font-bold text-gray-800">${(m.accuracy * 100).toFixed(1)}%</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-xs text-gray-500 mb-1">F1 Score</div>
            <div class="text-xl font-mono font-bold ${modelColors[key] || 'text-accent'}">${(m.f1 * 100).toFixed(1)}%</div>
          </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5">
          <div class="h-1.5 rounded-full bg-gradient-to-r from-accent to-purple-500" style="width:${(m.accuracy*100).toFixed(0)}%"></div>
        </div>
      </div>
    `).join('');
  } catch(e) {
    grid.innerHTML = '<div class="col-span-5 text-center text-red-400 text-sm py-6">Failed to load metrics.</div>';
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-rotate-right"></i> Refresh';
}

async function refreshMLOpsCharts() {
  const btn = document.getElementById('mlops-charts-refresh-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing…';
  window._mlopsInsights = null;
  document.getElementById('mlops-feature-chart').innerHTML =
    '<p class="text-gray-400 text-sm py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Loading…</p>';
  try {
    const ins = await apiFetch('/api/models/insights');
    window._mlopsInsights = ins.insights || {};
    const active = document.querySelector('.mlops-chart-tab[class*="bg-accent"]');
    switchMLOpsChart(active ? active.dataset.chart : 'random_forest');
  } catch(e) {
    document.getElementById('mlops-feature-chart').innerHTML =
      '<p class="text-red-400 text-sm py-4">Failed to load chart data.</p>';
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-rotate-right"></i> Refresh';
}

async function retrainSelected() {
  const selected = [...document.querySelectorAll('.mlops-chk:checked')].map(cb => cb.value);
  if (selected.length === 0) { alert('Select at least one model to retrain.'); return; }

  const btn = document.getElementById('mlops-retrain-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Retraining…';

  const logWrap = document.getElementById('mlops-log-wrap');
  const log = document.getElementById('mlops-log');
  logWrap.classList.remove('hidden');
  log.innerHTML = '';
  const addLog = (msg, cls='text-green-400') => {
    const ts = new Date().toLocaleTimeString();
    log.innerHTML += `<div class="${cls}">[${ts}] ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
  };

  addLog(`Starting retraining for: ${selected.join(', ')}`);

  try {
    await apiFetch('/api/models/retrain', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ models: selected })
    });
    addLog('Retraining job queued. Waiting for completion…', 'text-yellow-400');

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      addLog(`Checking status… (${attempts * 5}s elapsed)`);
      if (attempts >= 18) {
        clearInterval(poll);
        addLog('Retraining may still be running. Refreshing metrics…', 'text-yellow-400');
        await loadMLOps();
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play mr-2"></i>Retrain Selected';
      }
      try {
        const d = await apiFetch('/api/models/metrics');
        if (d && d.models) {
          clearInterval(poll);
          addLog('✓ Retraining complete! Metrics updated.', 'text-green-300');
          await loadMLOps();
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-play mr-2"></i>Retrain Selected';
        }
      } catch(_) {}
    }, 5000);
  } catch(e) {
    addLog('Error: ' + e.message, 'text-red-400');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play mr-2"></i>Retrain Selected';
  }
}
