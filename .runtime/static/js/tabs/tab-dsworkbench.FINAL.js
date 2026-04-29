// ============================================================
// tab-dsworkbench.js — Data Scientist Workbench
// ============================================================

let _dsDriftChart = null;
let _dsFeatureChart = null;
let _dsDatasets = [];
let _dsExperiments = [];

const _dsModels = [
  { id: 'fraud_v3',    name: 'Fraud Detection',      version: 'v3.2.1', accuracy: 94.7, f1: 0.921, auc: 0.978, status: 'production', last_trained: '2026-04-15', framework: 'XGBoost' },
  { id: 'risk_v2',     name: 'Risk Scoring',          version: 'v2.5.0', accuracy: 91.3, f1: 0.893, auc: 0.961, status: 'production', last_trained: '2026-04-10', framework: 'LightGBM' },
  { id: 'aml_v1',      name: 'AML Pattern Detector',  version: 'v1.8.3', accuracy: 88.9, f1: 0.874, auc: 0.943, status: 'production', last_trained: '2026-03-28', framework: 'Random Forest' },
  { id: 'kyc_v2',      name: 'KYC Verification',      version: 'v2.1.0', accuracy: 96.2, f1: 0.948, auc: 0.991, status: 'production', last_trained: '2026-04-20', framework: 'CNN' },
  { id: 'sanction_v1', name: 'Sanctions Screening',   version: 'v1.3.0', accuracy: 99.1, f1: 0.989, auc: 0.999, status: 'production', last_trained: '2026-04-01', framework: 'BERT NER' },
  { id: 'velocity_v1', name: 'Velocity Anomaly',      version: 'v1.0.2', accuracy: 82.4, f1: 0.801, auc: 0.876, status: 'staging',    last_trained: '2026-04-25', framework: 'Isolation Forest' },
];

const _dsFeatures = [
  { name: 'transaction_amount',    importance: 0.187 },
  { name: 'beneficiary_risk_score',importance: 0.164 },
  { name: 'time_since_last_tx',    importance: 0.141 },
  { name: 'country_risk_index',    importance: 0.118 },
  { name: 'tx_frequency_7d',       importance: 0.097 },
  { name: 'account_age_days',      importance: 0.084 },
  { name: 'kyc_score',             importance: 0.071 },
  { name: 'network_centrality',    importance: 0.063 },
  { name: 'avg_tx_amount_30d',     importance: 0.047 },
  { name: 'pep_flag',              importance: 0.028 },
];

// ── Main loader ──────────────────────────────────────────────
async function loadDSWorkbench() {
  renderDSKPIs();
  renderModelRegistry();
  renderDSDatasets();
  renderDSExperiments();
  renderDSDriftChart();
  renderDSFeatureChart();
}

// ── KPIs ─────────────────────────────────────────────────────
function renderDSKPIs() {
  const _set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  _set('dsKpiModels',      _dsModels.filter(m => m.status === 'production').length);
  _set('dsKpiDatasets',    _dsDatasets.length || 4);
  _set('dsKpiExperiments', _dsExperiments.length || 18);
  _set('dsKpiLastRetrain', '4h ago');
}

// ── Model Registry ───────────────────────────────────────────
function renderModelRegistry() {
  const tbody = document.getElementById('dsModelTable');
  if (!tbody) return;
  const statusCls = {
    production: 'bg-green-100 text-green-700',
    staging:    'bg-yellow-100 text-yellow-700',
    archived:   'bg-gray-100 text-gray-500',
  };
  tbody.innerHTML = _dsModels.map(m => {
    const accColor = m.accuracy >= 95 ? 'text-green-600' : m.accuracy >= 90 ? 'text-blue-600' : m.accuracy >= 85 ? 'text-yellow-600' : 'text-red-500';
    const stc = statusCls[m.status] || 'bg-gray-100 text-gray-500';
    return `<tr class="border-b border-gray-100 hover:bg-blue-50/30 transition">
      <td class="py-2.5 px-3">
        <p class="text-xs font-semibold text-gray-800">${m.name}</p>
        <p class="text-[10px] text-gray-400">${m.framework}</p>
      </td>
      <td class="py-2.5 px-3 text-xs text-gray-500 font-mono">${m.version}</td>
      <td class="py-2.5 px-3 text-xs font-bold ${accColor}">${m.accuracy}%</td>
      <td class="py-2.5 px-3 text-xs text-gray-600">${m.f1.toFixed(3)}</td>
      <td class="py-2.5 px-3 text-xs text-gray-600">${m.auc.toFixed(3)}</td>
      <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${stc}">${m.status}</span></td>
      <td class="py-2.5 px-3 text-[10px] text-gray-400">${m.last_trained}</td>
      <td class="py-2.5 px-3">
        <div class="flex gap-1.5">
          <button onclick="dsRetrainModel('${m.id}')" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition"><i class="fas fa-rotate-right mr-0.5"></i>Retrain</button>
          ${m.status === 'staging' ? `<button onclick="dsPromoteModel('${m.id}')" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition"><i class="fas fa-rocket mr-0.5"></i>Promote</button>` : ''}
          <button onclick="dsArchiveModel('${m.id}')" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"><i class="fas fa-box-archive mr-0.5"></i>Archive</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Dataset Manager ──────────────────────────────────────────
const _dsDefaultDatasets = [
  { name: 'transactions_q1_2026.csv', size: '4.2 MB', rows: 12450, type: 'Training',    uploaded: '2026-04-01', status: 'validated' },
  { name: 'aml_labeled_2025.csv',     size: '8.7 MB', rows: 31200, type: 'Training',    uploaded: '2026-03-15', status: 'validated' },
  { name: 'kyc_documents_v2.csv',     size: '1.1 MB', rows: 4800,  type: 'Validation', uploaded: '2026-04-10', status: 'validated' },
  { name: 'fraud_holdout_apr26.csv',  size: '2.3 MB', rows: 7100,  type: 'Test',       uploaded: '2026-04-22', status: 'pending'   },
];

function renderDSDatasets() {
  const el = document.getElementById('dsDatasetList');
  if (!el) return;
  const datasets = _dsDatasets.length ? _dsDatasets : _dsDefaultDatasets;
  const stc = { validated: 'bg-green-100 text-green-600', pending: 'bg-yellow-100 text-yellow-600', failed: 'bg-red-100 text-red-500' };
  el.innerHTML = datasets.map((d, i) => `
    <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition">
      <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
        <i class="fas fa-file-csv text-blue-500 text-sm"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-gray-800 truncate">${d.name}</p>
        <p class="text-[10px] text-gray-400">${d.rows.toLocaleString()} rows · ${d.size} · <span class="font-medium text-gray-600">${d.type}</span> · ${d.uploaded}</p>
      </div>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${stc[d.status] || ''} shrink-0">${d.status}</span>
      <button onclick="dsDeleteDataset(${i})" class="text-gray-300 hover:text-red-400 transition text-xs shrink-0"><i class="fas fa-trash"></i></button>
    </div>`).join('');
  document.getElementById('dsKpiDatasets').textContent = datasets.length;
}

function dsUploadDataset() {
  const input = document.getElementById('dsDatasetFile');
  const typeEl = document.getElementById('dsDatasetType');
  if (!input.files.length) { showToast('Please select a CSV file first', 'error'); return; }
  const file = input.files[0];
  const newDs = {
    name: file.name,
    size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
    rows: Math.floor(Math.random() * 20000) + 1000,
    type: typeEl?.value || 'Training',
    uploaded: new Date().toISOString().slice(0, 10),
    status: 'pending'
  };
  _dsDatasets = [newDs, ..._dsDefaultDatasets];
  renderDSDatasets();
  input.value = '';
  showToast(`Dataset "${file.name}" uploaded — validating…`, 'success');
  setTimeout(() => {
    _dsDatasets[0].status = 'validated';
    renderDSDatasets();
    showToast(`Dataset "${file.name}" validated ✓`, 'success');
  }, 2500);
}

function dsDeleteDataset(idx) {
  const datasets = _dsDatasets.length ? _dsDatasets : [..._dsDefaultDatasets];
  const name = datasets[idx]?.name;
  datasets.splice(idx, 1);
  if (_dsDatasets.length === 0) _dsDatasets = datasets;
  renderDSDatasets();
  showToast(`Dataset "${name}" removed`, 'info');
}

// ── Experiment Tracker ───────────────────────────────────────
const _dsDefaultExperiments = [
  { id: 'EXP-042', model: 'Fraud Detection',     dataset: 'transactions_q1_2026.csv', accuracy: 94.7, f1: 0.921, duration: '14m 32s', status: 'completed', date: '2026-04-15 10:22' },
  { id: 'EXP-041', model: 'Risk Scoring',         dataset: 'aml_labeled_2025.csv',     accuracy: 91.3, f1: 0.893, duration: '9m 18s',  status: 'completed', date: '2026-04-10 15:41' },
  { id: 'EXP-040', model: 'Velocity Anomaly',     dataset: 'transactions_q1_2026.csv', accuracy: 82.4, f1: 0.801, duration: '6m 44s',  status: 'completed', date: '2026-04-25 09:05' },
  { id: 'EXP-039', model: 'AML Pattern Detector', dataset: 'aml_labeled_2025.csv',     accuracy: 88.9, f1: 0.874, duration: '21m 07s', status: 'completed', date: '2026-03-28 14:17' },
  { id: 'EXP-038', model: 'KYC Verification',     dataset: 'kyc_documents_v2.csv',     accuracy: 96.2, f1: 0.948, duration: '33m 51s', status: 'completed', date: '2026-04-20 11:30' },
];

function renderDSExperiments() {
  const tbody = document.getElementById('dsExpTable');
  if (!tbody) return;
  const exps = _dsExperiments.length ? _dsExperiments : _dsDefaultExperiments;
  const stc = { completed: 'bg-green-100 text-green-600', running: 'bg-blue-100 text-blue-600', failed: 'bg-red-100 text-red-500' };
  tbody.innerHTML = exps.map(e => {
    const accColor = e.accuracy >= 94 ? 'text-green-600' : e.accuracy >= 90 ? 'text-blue-600' : 'text-yellow-600';
    return `<tr class="border-b border-gray-100 hover:bg-purple-50/20 transition">
      <td class="py-2 px-3 font-mono text-[10px] text-gray-400">${e.id}</td>
      <td class="py-2 px-3 text-xs font-medium text-gray-800">${e.model}</td>
      <td class="py-2 px-3 text-[10px] text-gray-500 truncate max-w-[130px]">${e.dataset}</td>
      <td class="py-2 px-3 text-xs font-bold ${accColor}">${e.accuracy}%</td>
      <td class="py-2 px-3 text-xs text-gray-600">${e.f1}</td>
      <td class="py-2 px-3 text-[10px] text-gray-400">${e.duration}</td>
      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${stc[e.status] || ''}">${e.status}</span></td>
      <td class="py-2 px-3 text-[10px] text-gray-400">${e.date}</td>
    </tr>`;
  }).join('');
  document.getElementById('dsKpiExperiments').textContent = exps.length;
}

// ── Retraining Pipeline ──────────────────────────────────────
let _dsRetrainRunning = false;

function dsRunPipeline() {
  if (_dsRetrainRunning) return;
  const modelSel   = document.getElementById('dsPipelineModel')?.value;
  const datasetSel = document.getElementById('dsPipelineDataset')?.value;
  const lrEl       = document.getElementById('dsPipelineLR');
  const epochsEl   = document.getElementById('dsPipelineEpochs');
  const logEl      = document.getElementById('dsPipelineLog');
  const btn        = document.getElementById('dsPipelineBtn');
  const progressEl = document.getElementById('dsPipelineProgress');

  if (!modelSel || !datasetSel) { showToast('Select a model and dataset first', 'error'); return; }

  _dsRetrainRunning = true;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1.5"></i>Running…'; }
  if (logEl) logEl.innerHTML = '';
  if (progressEl) progressEl.style.width = '0%';

  const logs = [
    '[00:01] 🔄 Initializing pipeline…',
    `[00:02] 📦 Loading dataset: ${datasetSel}`,
    '[00:04] ✅ Dataset loaded — 12,450 samples, 47 features',
    '[00:05] 🔍 Running feature validation…',
    '[00:07] ✅ Feature validation passed',
    `[00:08] ⚙️  Configuring ${modelSel} — LR: ${lrEl?.value||'0.01'}, Epochs: ${epochsEl?.value||'50'}`,
    '[00:12] 🏋️ Training started…',
    '[00:25] 📈 Epoch 10/50 — loss: 0.341, acc: 87.2%',
    '[00:38] 📈 Epoch 20/50 — loss: 0.218, acc: 91.4%',
    '[00:51] 📈 Epoch 30/50 — loss: 0.157, acc: 93.1%',
    '[01:04] 📈 Epoch 40/50 — loss: 0.124, acc: 94.0%',
    '[01:17] 📈 Epoch 50/50 — loss: 0.108, acc: 94.8%',
    '[01:18] 🧪 Running validation on holdout set…',
    '[01:20] ✅ Validation accuracy: 94.7% | F1: 0.921 | AUC: 0.978',
    '[01:21] 🚀 Model promoted to staging — awaiting approval',
    '[01:22] ✅ Pipeline completed successfully!',
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < logs.length) {
      if (logEl) logEl.innerHTML += `<div class="text-[11px] font-mono ${logs[i].includes('✅') ? 'text-green-400' : logs[i].includes('📈') ? 'text-blue-400' : logs[i].includes('🚀') ? 'text-purple-400' : 'text-gray-300'}">${logs[i]}</div>`;
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
      if (progressEl) progressEl.style.width = Math.round((i / logs.length) * 100) + '%';
      i++;
    } else {
      clearInterval(interval);
      _dsRetrainRunning = false;
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play mr-1.5"></i>Run Pipeline'; }
      if (progressEl) progressEl.style.width = '100%';
      // Add to experiments
      const newExp = {
        id: `EXP-${43 + _dsExperiments.length}`,
        model: modelSel, dataset: datasetSel,
        accuracy: 94.8, f1: 0.921, duration: '1m 22s', status: 'completed',
        date: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };
      _dsExperiments = [newExp, ...(_dsExperiments.length ? _dsExperiments : _dsDefaultExperiments)];
      renderDSExperiments();
      showToast('Retraining pipeline completed — model in staging ✓', 'success');
    }
  }, 300);
}

function dsRetrainModel(modelId) {
  const m = _dsModels.find(m => m.id === modelId);
  if (!m) return;
  const modelSel = document.getElementById('dsPipelineModel');
  if (modelSel) modelSel.value = m.name;
  document.getElementById('tab-dsworkbench').querySelector('[data-dstab="pipeline"]')?.click();
  showToast(`Pipeline pre-configured for ${m.name}`, 'info');
  // Scroll to pipeline section
  setTimeout(() => {
    const el = document.getElementById('dsPipelineSection');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

function dsPromoteModel(modelId) {
  const m = _dsModels.find(m => m.id === modelId);
  if (!m) return;
  m.status = 'production';
  renderModelRegistry();
  showToast(`${m.name} promoted to production ✓`, 'success');
}

function dsArchiveModel(modelId) {
  const m = _dsModels.find(m => m.id === modelId);
  if (!m) return;
  m.status = 'archived';
  renderModelRegistry();
  showToast(`${m.name} archived`, 'info');
}

// ── Model Drift Monitor Chart ─────────────────────────────────
function renderDSDriftChart() {
  const canvas = document.getElementById('dsDriftChart');
  if (!canvas) return;
  const labels = ['Apr 1','Apr 5','Apr 9','Apr 13','Apr 17','Apr 21','Apr 25','Apr 29'];
  if (_dsDriftChart) { _dsDriftChart.destroy(); _dsDriftChart = null; }
  _dsDriftChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Fraud Detection', data: [94.2, 94.5, 94.1, 94.8, 94.3, 94.6, 94.7, 94.7], borderColor: '#6366f1', backgroundColor: '#6366f115', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'Risk Scoring',    data: [91.0, 91.2, 90.8, 91.5, 91.1, 91.4, 91.3, 91.3], borderColor: '#3b82f6', backgroundColor: '#3b82f615', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'AML Detector',    data: [88.5, 88.7, 88.2, 89.0, 88.6, 89.1, 88.9, 88.9], borderColor: '#f59e0b', backgroundColor: '#f59e0b15', tension: 0.4, fill: true, pointRadius: 3 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } } },
      scales: {
        y: { min: 85, max: 98, ticks: { font: { size: 10 } }, title: { display: true, text: 'Accuracy %', font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

// ── Feature Importance Chart ──────────────────────────────────
function renderDSFeatureChart() {
  const canvas = document.getElementById('dsFeatureChart');
  if (!canvas) return;
  if (_dsFeatureChart) { _dsFeatureChart.destroy(); _dsFeatureChart = null; }
  _dsFeatureChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: _dsFeatures.map(f => f.name),
      datasets: [{
        label: 'SHAP Importance',
        data: _dsFeatures.map(f => f.importance),
        backgroundColor: _dsFeatures.map((_, i) => `hsl(${220 + i * 12}, 70%, ${55 + i * 2}%)`),
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { font: { size: 10 } } },
        y: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

// ── Sub-tab switching ─────────────────────────────────────────
function switchDSTab(tab) {
  document.querySelectorAll('.ds-tab-pane').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.ds-tab-btn').forEach(b => {
    b.classList.remove('bg-accent', 'text-white');
    b.classList.add('text-gray-500', 'hover:text-accent');
  });
  const pane = document.getElementById('dsPane-' + tab);
  if (pane) pane.classList.remove('hidden');
  const btn = document.querySelector(`[data-dstab="${tab}"]`);
  if (btn) { btn.classList.add('bg-accent', 'text-white'); btn.classList.remove('text-gray-500', 'hover:text-accent'); }
}
