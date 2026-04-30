// tab-spending360.js — Spending 360 module for IPTS

let spt360MonthlyChart = null;
let spt360StatusChart = null;
let spt360RiskChart = null;
let spt360CurrencyChart = null;
let spt360HourlyChart = null;
let spt360DowChart = null;

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
  if (spt360MonthlyChart) spt360MonthlyChart.destroy();
  spt360MonthlyChart = makeChart('spt360MonthlyChart', {
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
  if (spt360StatusChart) spt360StatusChart.destroy();
  const colors = { settled: '#0D47A1', blocked: '#ef4444', flagged: '#f59e0b', pending: '#8b5cf6' };
  spt360StatusChart = makeChart('spt360StatusChart', {
    type: 'doughnut',
    data: {
      labels: data.map(d => (d.status || 'unknown').toUpperCase()),
      datasets: [{
        data: data.map(d => d.amount),
        backgroundColor: data.map(d => colors[d.status] || '#6b7280'),
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'right', labels: { color: '#9ca3af', padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: $${Number(ctx.raw).toLocaleString()}` } }
      }
    }
  });
}

function renderRiskChart(data) {
  if (spt360RiskChart) spt360RiskChart.destroy();
  spt360RiskChart = makeChart('spt360RiskChart', {
    type: 'bar',
    data: {
      labels: ['Low (<30)', 'Medium (30-60)', 'High (60-80)', 'Critical (80+)'],
      datasets: [{
        data: [data.low || 0, data.medium || 0, data.high || 0, data.critical || 0],
        backgroundColor: ['#0D47A1', '#f59e0b', '#f97316', '#ef4444'],
        borderRadius: 6,
        barThickness: 40,
      }]
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
  if (spt360CurrencyChart) spt360CurrencyChart.destroy();
  const currColors = ['#0D47A1','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316','#84cc16','#6366f1','#14b8a6','#e11d48','#a855f7'];
  spt360CurrencyChart = makeChart('spt360CurrencyChart', {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.currency),
      datasets: [{
        data: data.map(d => d.amount),
        backgroundColor: data.map((_, i) => currColors[i % currColors.length]),
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { color: '#9ca3af', padding: 10, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: $${Number(ctx.raw).toLocaleString()}` } }
      }
    }
  });
}

function renderHourlyChart(data) {
  if (spt360HourlyChart) spt360HourlyChart.destroy();
  const hours = Array.from({length: 24}, (_, i) => i);
  const hourMap = {};
  data.forEach(d => { hourMap[d.hour] = d; });
  spt360HourlyChart = makeChart('spt360HourlyChart', {
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
  if (spt360DowChart) spt360DowChart.destroy();
  const allDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayMap = {};
  data.forEach(d => { dayMap[d.day] = d; });
  spt360DowChart = makeChart('spt360DowChart', {
    type: 'bar',
    data: {
      labels: allDays,
      datasets: [{
        label: 'Amount ($)',
        data: allDays.map(d => (dayMap[d] || {}).amount || 0),
        backgroundColor: 'rgba(59,130,246,0.6)',
        borderRadius: 6,
        barThickness: 30,
      }, {
        label: 'Count',
        data: allDays.map(d => (dayMap[d] || {}).count || 0),
        backgroundColor: 'rgba(16,185,129,0.6)',
        borderRadius: 6,
        barThickness: 30,
        yAxisID: 'y1',
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

// Stubs
async function loadSpendingChart() { console.log('loadSpendingChart — delegating to loadSpending360'); return loadSpending360(); }
async function loadCategories() { console.log('loadCategories — not yet implemented'); }
