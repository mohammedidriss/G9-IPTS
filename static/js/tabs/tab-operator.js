// tab-operator.js — Operations Control Center (operator role only)

let _opsChart = null;

async function loadOperatorCenter() {
  await Promise.all([
    loadOpsKPIs(),
    loadOpsQueue(),
    loadOpsSLAChart(),
    loadOpsNostro(),
  ]);
}

async function loadOpsKPIs() {
  try {
    const d = await apiFetch('/api/operator/kpis');
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('opsProcessedToday', d.processed_today ?? '—');
    set('opsPendingQueue',   d.pending_queue ?? '—');
    set('opsSLAPct',         (d.sla_compliance_pct != null ? d.sla_compliance_pct + '%' : '—'));
    set('opsAvgSec',         (d.avg_processing_sec != null ? d.avg_processing_sec + 's' : '—'));
    set('opsPendingApprovals', d.pending_approvals ?? '—');
  } catch(e) { console.warn('OpsKPI error', e); }
}

async function loadOpsQueue() {
  try {
    const d = await apiFetch('/api/operator/queue');
    const tbody = document.getElementById('opsQueueBody');
    if (!tbody) return;
    if (!d.queue || d.queue.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-gray-400">No transactions found.</td></tr>';
      return;
    }
    tbody.innerHTML = d.queue.map(tx => {
      const riskCls = tx.risk_score >= 80 ? 'text-red-500' : tx.risk_score >= 60 ? 'text-orange-400' : tx.risk_score >= 30 ? 'text-yellow-400' : 'text-green-400';
      const statusCls = 'status-' + (tx.status || 'pending');
      const slaMs = tx.settlement_time_ms;
      const slaCls = !slaMs ? 'text-gray-400' : slaMs <= 30000 ? 'text-green-400' : 'text-red-400';
      const slaVal = !slaMs ? '—' : (slaMs / 1000).toFixed(1) + 's';
      const dateStr = tx.created_at ? new Date(tx.created_at).toLocaleString() : '—';
      return `<tr class="border-b border-gray-100 hover:bg-blue-50 text-xs">
        <td class="py-2 pr-2 font-mono text-gray-400">${(tx.id||'').substring(0,8)}…</td>
        <td class="py-2 pr-2 text-gray-700">${tx.sender || '—'}</td>
        <td class="py-2 pr-2 text-gray-700">${tx.receiver || '—'}</td>
        <td class="py-2 pr-2 text-right font-mono font-semibold">$${Number(tx.amount||0).toLocaleString()}</td>
        <td class="py-2 pr-2 font-mono text-accent">${tx.currency||'USD'}</td>
        <td class="py-2 pr-2 text-right font-mono ${riskCls}">${(tx.risk_score||0).toFixed(1)}</td>
        <td class="py-2 pr-2"><span class="badge ${statusCls}">${(tx.status||'pending').toUpperCase()}</span></td>
        <td class="py-2 font-mono ${slaCls}">${slaVal}</td>
      </tr>`;
    }).join('');
  } catch(e) { console.warn('OpsQueue error', e); }
}

async function loadOpsSLAChart() {
  try {
    const d = await apiFetch('/api/operator/sla-stats');
    const ctx = document.getElementById('opsSLAChart');
    if (!ctx || !d.stats || d.stats.length === 0) return;
    if (_opsChart) _opsChart.destroy();
    const labels = d.stats.map(s => (s.status || 'unknown').toUpperCase());
    _opsChart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'On-Time', data: d.stats.map(s => s.on_time), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 4 },
          { label: 'SLA Breach', data: d.stats.map(s => s.breach), backgroundColor: 'rgba(239,68,68,0.65)', borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#6b7280', font: { size: 11 } } } },
        scales: {
          x: { stacked: true, ticks: { color: '#6b7280' }, grid: { display: false } },
          y: { stacked: true, ticks: { color: '#6b7280', stepSize: 1 }, grid: { color: 'rgba(209,217,224,0.4)' } },
        }
      }
    });
  } catch(e) { console.warn('OpsSLA error', e); }
}

async function loadOpsNostro() {
  try {
    const d = await apiFetch('/api/operator/nostro-status');
    const tbody = document.getElementById('opsNostroBody');
    if (!tbody) return;
    if (!d.nostro || d.nostro.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400">No data.</td></tr>';
      return;
    }
    tbody.innerHTML = d.nostro.map(n => {
      const flowPct = n.total_flow > 0 ? Math.round(n.settled_amount / n.total_flow * 100) : 0;
      const statusDot = flowPct >= 80 ? '🟢' : flowPct >= 50 ? '🟡' : '🔴';
      return `<tr class="border-b border-gray-100 hover:bg-blue-50 text-xs">
        <td class="py-2.5 pr-3 font-mono font-bold text-accent">${n.currency}</td>
        <td class="py-2.5 pr-3 text-right text-gray-600">${n.tx_count}</td>
        <td class="py-2.5 pr-3 text-right font-mono">$${Number(n.total_flow||0).toLocaleString('en-US',{maximumFractionDigits:0})}</td>
        <td class="py-2.5 pr-3 text-right font-mono text-green-600">$${Number(n.settled_amount||0).toLocaleString('en-US',{maximumFractionDigits:0})}</td>
        <td class="py-2.5 text-center">${statusDot} ${flowPct}%</td>
      </tr>`;
    }).join('');
  } catch(e) { console.warn('OpsNostro error', e); }
}
