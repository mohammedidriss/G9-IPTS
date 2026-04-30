// ============================================================
// Security — role-based entry point
// ============================================================
function loadSecurity() {
  const role = (localStorage.getItem('ipts_role') || window.ROLE || '').toLowerCase();
  // All staff roles (admin, compliance, operator, auditor, datascientist) → Security Operations Center
  const isStaff  = ['admin','compliance','operator','auditor','datascientist'].includes(role);
  const isClient = !isStaff;

  document.getElementById('secAdminSOC').classList.toggle('hidden', !isStaff);
  document.getElementById('secComplianceView').classList.toggle('hidden', true); // merged into SOC
  document.getElementById('secClientView').classList.toggle('hidden', !isClient);

  if (isStaff) {
    loadSOC();
  } else {
    // Client: show E-KYC verification + fraud alerts
    loadKYCStatus();
    loadFraudAlerts();
  }
}

// ── Compliance / Auditor Security View ──────────────────────
async function loadComplianceSecurity() {
  try {
    const [auditData, fraudData] = await Promise.all([
      apiFetch('/api/audit').catch(() => ({ logs: [] })),
      apiFetch('/api/fraud/alerts').catch(() => ({ alerts: [] }))
    ]);

    const logs   = auditData.logs || auditData.audit_logs || [];
    const alerts = fraudData.alerts || [];
    const highRisk = alerts.filter(a => (a.risk_score||0) >= 70 || a.severity === 'critical' || a.severity === 'high').length;

    // KPIs
    _setText('csecKpiAudit',    logs.length);
    _setText('csecKpiPriv',     _socPrivLog.length);
    _setText('csecKpiSessions', _socSessions.length);
    _setText('csecKpiHighRisk', highRisk);

    // Audit Log
    const auditEl = document.getElementById('csecAuditLog');
    if (auditEl) {
      auditEl.innerHTML = logs.length ? logs.slice(0, 20).map(l => {
        const ok = /success|login(?!.*fail)/i.test(l.event_type || l.action || '');
        const riskCls = /delete|block|escalat|override/i.test(l.event_type || l.action || '') ? 'text-red-500' : ok ? 'text-green-400' : 'text-gray-400';
        return `<div class="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
          <i class="fas fa-circle text-[6px] ${riskCls} shrink-0 mt-0.5"></i>
          <span class="text-xs text-gray-700 flex-1 truncate">${l.actor || l.username || '—'} — ${l.event_type || l.action || '—'}</span>
          <span class="text-[10px] text-gray-400 shrink-0">${l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—'}</span>
        </div>`;
      }).join('') : '<p class="text-gray-400 text-xs text-center py-6">No audit events found</p>';
    }

    // Privileged Access Log (reuse SOC data)
    const privEl = document.getElementById('csecPrivLog');
    if (privEl) {
      const riskColor = { high:'text-red-500', medium:'text-orange-400', low:'text-green-500' };
      privEl.innerHTML = _socPrivLog.map(l => `
        <div class="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
          <i class="fas fa-circle text-[6px] mt-1.5 ${riskColor[l.risk]||'text-gray-400'} shrink-0"></i>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-800 leading-tight">${l.action}</p>
            <p class="text-[10px] text-gray-400">${l.user} · ${_formatDuration(Date.now()-l.ts)} ago</p>
          </div>
          <span class="text-[10px] font-semibold ${riskColor[l.risk]||''} shrink-0">${l.risk}</span>
        </div>`).join('');
    }

    // Active Sessions (read-only, no lock/terminate buttons)
    const sessEl = document.getElementById('csecSessions');
    if (sessEl) {
      sessEl.innerHTML = _socSessions.map(s => {
        const dur = _formatDuration(Date.now() - s.started);
        const roleColor = {admin:'text-red-500',operator:'text-orange-400',client:'text-blue-400',compliance:'text-purple-400'}[s.role]||'text-gray-400';
        return `<div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <i class="fas fa-user text-accent text-xs"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-gray-800">${s.user}</span>
              <span class="text-[10px] font-medium ${roleColor}">${s.role}</span>
            </div>
            <p class="text-[10px] text-gray-400">${s.ip} · ${s.location} · ${dur}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-600">active</span>
        </div>`;
      }).join('') || '<p class="text-gray-400 text-xs text-center py-6">No active sessions</p>';
    }

    // Security Alerts
    const alertsEl = document.getElementById('csecAlerts');
    if (alertsEl) {
      alertsEl.innerHTML = alerts.length ? alerts.slice(0, 8).map(a => {
        const sev = a.severity || ((a.risk_score||0) >= 80 ? 'critical' : 'high');
        const color = sev === 'critical' ? 'border-red-500 bg-red-50' : sev === 'high' ? 'border-orange-400 bg-orange-50' : 'border-yellow-400 bg-yellow-50';
        const badge = sev === 'critical' ? 'bg-red-100 text-red-600' : sev === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600';
        return `<div class="flex items-start gap-3 p-3 rounded-lg border-l-2 ${color}">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${badge} uppercase mt-0.5 shrink-0">${sev}</span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-gray-800 truncate">${a.beneficiary || 'Unknown'}</p>
            <p class="text-xs text-gray-500">${a.reason || a.alert_type || '—'} · Risk ${a.risk_score || '—'}</p>
          </div>
          <span class="ml-auto text-[10px] text-gray-400 shrink-0">$${Number(a.amount||0).toLocaleString()}</span>
        </div>`;
      }).join('') : '<p class="text-gray-400 text-xs text-center py-6">No active security alerts</p>';
    }

  } catch(e) { console.error('Compliance security load error', e); }
}

// ── SOC data (uses existing fraud/audit endpoints + synthetic data) ──────────
const _socBlockedIPs = ['185.220.101.34', '45.155.205.233', '103.21.244.0'];
const _socIncidents = [
  { id: 'INC-001', title: 'Brute-force login attempt', severity: 'critical', status: 'open', ts: Date.now()-3600000 },
  { id: 'INC-002', title: 'Unusual high-value transfer pattern', severity: 'high', status: 'investigating', ts: Date.now()-7200000 },
  { id: 'INC-003', title: 'Sanctioned entity match – auto-blocked', severity: 'medium', status: 'resolved', ts: Date.now()-86400000 },
];

async function loadSOC() {
  try {
    // KPI: pull fraud alerts + audit log
    const [fraudData, auditData] = await Promise.all([
      apiFetch('/api/fraud/alerts').catch(() => ({ alerts: [] })),
      apiFetch('/api/audit').catch(() => ({ logs: [] }))
    ]);
    const alerts = fraudData.alerts || [];
    const highRisk = alerts.filter(a => (a.risk_score || 0) >= 80 || a.severity === 'critical' || a.severity === 'high').length;

    _setText('socKpiThreats', _socIncidents.filter(i => i.status !== 'resolved').length);
    _setText('socKpiAlerts', highRisk || alerts.length);
    _setText('socKpiBlocked', _socBlockedIPs.length);
    _setText('socKpiHealth', '99.8%');

    // Threat feed
    const feed = document.getElementById('socThreatFeed');
    const badge = document.getElementById('socThreatBadge');
    if (feed) {
      const items = alerts.slice(0, 10).map(a => {
        const sev = a.severity || (a.risk_score >= 80 ? 'critical' : 'high');
        const color = sev === 'critical' ? 'border-red-500 bg-red-50' : sev === 'high' ? 'border-orange-400 bg-orange-50' : 'border-yellow-400 bg-yellow-50';
        const badge2 = sev === 'critical' ? 'bg-red-100 text-red-600' : sev === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600';
        return `<div class="flex items-start gap-3 p-3 rounded-lg border-l-2 ${color}">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${badge2} uppercase mt-0.5 shrink-0">${sev}</span>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-gray-800 truncate">${a.beneficiary || 'Unknown entity'}</p>
            <p class="text-xs text-gray-500">${a.reason || a.alert_type || '—'} · Risk ${a.risk_score || '—'}</p>
          </div>
          <span class="ml-auto text-[10px] text-gray-400 shrink-0">$${Number(a.amount||0).toLocaleString()}</span>
        </div>`;
      });
      feed.innerHTML = items.length ? items.join('') : '<p class="text-gray-400 text-xs text-center py-6">No active threats</p>';
      if (badge) { badge.textContent = alerts.length + ' threats'; badge.className = `px-2 py-0.5 rounded-full text-xs font-semibold ${alerts.length ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`; }
    }

    // Incident queue
    const iq = document.getElementById('socIncidentQueue');
    if (iq) {
      iq.innerHTML = _socIncidents.map(inc => {
        const sc = inc.severity === 'critical' ? 'text-red-500 bg-red-50 border-red-200' : inc.severity === 'high' ? 'text-orange-500 bg-orange-50 border-orange-200' : 'text-yellow-600 bg-yellow-50 border-yellow-200';
        const stc = inc.status === 'resolved' ? 'text-green-600 bg-green-100' : inc.status === 'investigating' ? 'text-blue-600 bg-blue-100' : 'text-red-600 bg-red-100';
        return `<div class="flex items-center gap-3 p-3 rounded-lg border ${sc}">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-gray-800">${inc.id} — ${inc.title}</p>
            <p class="text-[10px] text-gray-400">${new Date(inc.ts).toLocaleString()}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${stc}">${inc.status}</span>
        </div>`;
      }).join('');
    }

    // Auth events from audit log
    const ae = document.getElementById('socAuthEvents');
    if (ae) {
      const logs = (auditData.logs || auditData.audit_logs || []).filter(l => /login|auth|access|logout/i.test(l.event_type || l.action || '')).slice(0, 12);
      ae.innerHTML = logs.length ? logs.map(l => {
        const ok = /success|login(?!.*fail)/i.test(l.event_type || l.action || '');
        return `<div class="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
          <i class="fas ${ok ? 'fa-circle-check text-green-400' : 'fa-circle-xmark text-red-400'} text-xs shrink-0"></i>
          <span class="text-xs text-gray-700 flex-1 truncate">${l.actor || l.username || '—'} — ${l.event_type || l.action || '—'}</span>
          <span class="text-[10px] text-gray-400 shrink-0">${l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—'}</span>
        </div>`;
      }).join('') : '<p class="text-gray-400 text-xs text-center py-6">No recent auth events</p>';
    }

    // IP Blocklist
    _renderBlocklist();

    // New panels
    renderPostureScore();
    renderThreatOriginMap();
    renderActiveSessions();
    renderVulnerabilities();
    renderApiAbuse();
    renderPrivAccessLog();

  } catch(e) { console.error('SOC load error', e); }
}

function _setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function _renderBlocklist() {
  const bl = document.getElementById('socBlocklist');
  if (!bl) return;
  bl.innerHTML = _socBlockedIPs.length ? _socBlockedIPs.map((ip, i) => `
    <div class="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span class="text-xs font-mono text-gray-700">${ip}</span>
      <button onclick="socUnblockIP(${i})" class="text-[10px] text-red-400 hover:text-red-600 transition">Unblock</button>
    </div>`).join('') : '<p class="text-gray-400 text-xs text-center py-4">No blocked IPs</p>';
}

function socBlockIP() {
  const input = document.getElementById('socBlockIpInput');
  const ip = (input.value || '').trim();
  if (!ip) return;
  if (!_socBlockedIPs.includes(ip)) _socBlockedIPs.push(ip);
  input.value = '';
  _setText('socKpiBlocked', _socBlockedIPs.length);
  _renderBlocklist();
  showToast(`IP ${ip} blocked`, 'success');
}

function socUnblockIP(idx) {
  const ip = _socBlockedIPs[idx];
  _socBlockedIPs.splice(idx, 1);
  _setText('socKpiBlocked', _socBlockedIPs.length);
  _renderBlocklist();
  showToast(`IP ${ip} unblocked`, 'info');
}

function socCreateIncident() {
  const title = prompt('Incident title:');
  if (!title) return;
  _socIncidents.unshift({ id: `INC-${String(_socIncidents.length+1).padStart(3,'0')}`, title, severity: 'high', status: 'open', ts: Date.now() });
  loadSOC();
  showToast('Incident created', 'success');
}

// ============================================================
// SOC — Security Posture Score
// ============================================================
const _socPostureCategories = [
  { label: 'Authentication',    score: 88, color: '#6366f1' },
  { label: 'Network Security',  score: 74, color: '#3b82f6' },
  { label: 'Data Protection',   score: 91, color: '#10b981' },
  { label: 'Access Control',    score: 82, color: '#f59e0b' },
  { label: 'Threat Detection',  score: 79, color: '#ef4444' },
];

function renderPostureScore() {
  const overall = Math.round(_socPostureCategories.reduce((s,c)=>s+c.score,0) / _socPostureCategories.length);
  _setText('socPostureScore', overall);

  // Draw arc gauge on canvas
  const canvas = document.getElementById('socPostureCanvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const cx = 56, cy = 56, r = 46, lw = 10;
    ctx.clearRect(0,0,112,112);
    // Background arc
    ctx.beginPath(); ctx.arc(cx,cy,r, Math.PI*0.75, Math.PI*2.25);
    ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=lw; ctx.lineCap='round'; ctx.stroke();
    // Value arc
    const pct = overall/100;
    const startA = Math.PI*0.75, endA = startA + pct*Math.PI*1.5;
    const grad = ctx.createLinearGradient(cx-r,cy,cx+r,cy);
    grad.addColorStop(0, overall>=80?'#10b981':overall>=60?'#f59e0b':'#ef4444');
    grad.addColorStop(1, overall>=80?'#6366f1':'#f59e0b');
    ctx.beginPath(); ctx.arc(cx,cy,r,startA,endA);
    ctx.strokeStyle=grad; ctx.lineWidth=lw; ctx.lineCap='round'; ctx.stroke();
  }

  // Breakdown bars
  const el = document.getElementById('socPostureBreakdown');
  if (!el) return;
  el.innerHTML = _socPostureCategories.map(c => `
    <div>
      <div class="flex justify-between text-xs mb-0.5">
        <span class="text-gray-600">${c.label}</span>
        <span class="font-semibold" style="color:${c.color}">${c.score}</span>
      </div>
      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all" style="width:${c.score}%;background:${c.color}"></div>
      </div>
    </div>`).join('');
}

// ============================================================
// SOC — Threat Origin Map (D3)
// ============================================================
const _socThreatOrigins = [
  { country:'Russia',    lat:61.52, lng:105.31, count:47, severity:'critical' },
  { country:'China',     lat:35.86, lng:104.19, count:38, severity:'critical' },
  { country:'Nigeria',   lat:9.08,  lng:8.68,   count:22, severity:'high' },
  { country:'Brazil',    lat:-14.2, lng:-51.9,  count:15, severity:'high' },
  { country:'Iran',      lat:32.43, lng:53.69,  count:19, severity:'critical' },
  { country:'Romania',   lat:45.94, lng:24.97,  count:11, severity:'medium' },
  { country:'Ukraine',   lat:48.38, lng:31.17,  count:9,  severity:'medium' },
  { country:'Indonesia', lat:-0.79, lng:113.92, count:8,  severity:'medium' },
  { country:'Vietnam',   lat:14.06, lng:108.28, count:6,  severity:'low' },
  { country:'India',     lat:20.59, lng:78.96,  count:5,  severity:'low' },
];

let _socMapWorld = null;
async function renderThreatOriginMap() {
  const container = document.getElementById('socThreatMap');
  if (!container) return;
  try {
    if (!_socMapWorld) _socMapWorld = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    const topo = topojson.feature(_socMapWorld, _socMapWorld.objects.countries);
    const W = container.clientWidth || 600, H = 220;
    container.innerHTML = '';
    container.style.position = 'relative';

    const svg = d3.select(container).append('svg').attr('width',W).attr('height',H)
      .style('background','#0a1628').style('border-radius','8px').style('display','block');
    const proj = d3.geoNaturalEarth1().fitExtent([[5,5],[W-5,H-5]], topo);
    const path = d3.geoPath().projection(proj);
    const g = svg.append('g');

    g.selectAll('path').data(topo.features).join('path')
      .attr('d',path).attr('fill','#1a2744').attr('stroke','#253554').attr('stroke-width',0.4);

    const sevColor = { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e' };
    const tooltip = d3.select(container).append('div')
      .style('position','absolute').style('background','rgba(10,22,40,0.95)')
      .style('border','1px solid #3b82f6').style('padding','8px 12px').style('border-radius','6px')
      .style('font-size','11px').style('color','#e2e8f0').style('pointer-events','none').style('opacity',0).style('z-index',50);

    _socThreatOrigins.forEach(o => {
      const [px,py] = proj([o.lng,o.lat]);
      if (!px||!py) return;
      const r = 4 + o.count/8;
      const col = sevColor[o.severity] || '#94a3b8';
      g.append('circle').attr('cx',px).attr('cy',py).attr('r',r+4)
        .attr('fill',col+'22').attr('stroke','none');
      g.append('circle').attr('cx',px).attr('cy',py).attr('r',r)
        .attr('fill',col+'99').attr('stroke',col).attr('stroke-width',1.2)
        .attr('cursor','pointer')
        .on('mouseover',e=>tooltip.style('opacity',1).html(`<strong>${o.country}</strong><br>${o.count} attacks · <span style="color:${col}">${o.severity}</span>`))
        .on('mousemove',e=>tooltip.style('left',(e.offsetX+12)+'px').style('top',(e.offsetY-10)+'px'))
        .on('mouseout',()=>tooltip.style('opacity',0));
    });

    const total = _socThreatOrigins.reduce((s,o)=>s+o.count,0);
    _setText('socMapBadge', `${total} attacks from ${_socThreatOrigins.length} countries`);
  } catch(e) { console.error('SOC map error',e); }
}

// ============================================================
// SOC — Active Sessions (with Lock/Unlock accounts)
// ============================================================
const _socSessions = [
  { id:'s001', user:'admin',     role:'admin',    ip:'192.168.1.10', location:'Beirut, LB', started: Date.now()-1800000, status:'active' },
  { id:'s002', user:'operator1', role:'operator', ip:'10.0.0.55',    location:'Dubai, AE',  started: Date.now()-3600000, status:'active' },
  { id:'s003', user:'client_a',  role:'client',   ip:'45.32.100.22', location:'London, GB', started: Date.now()-600000,  status:'active' },
  { id:'s004', user:'analyst',   role:'compliance',ip:'172.16.0.8',  location:'Riyadh, SA', started: Date.now()-7200000, status:'active' },
];
const _lockedAccounts = new Set();

function renderActiveSessions() {
  const el = document.getElementById('socSessionList');
  if (!el) return;
  _setText('socSessionCount', `${_socSessions.length} active`);
  el.innerHTML = _socSessions.map(s => {
    const locked = _lockedAccounts.has(s.user);
    const dur = _formatDuration(Date.now() - s.started);
    const roleColor = {admin:'text-red-500',operator:'text-orange-400',client:'text-blue-400',compliance:'text-purple-400'}[s.role]||'text-gray-400';
    return `<div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
        <i class="fas fa-user text-accent text-xs"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-gray-800">${s.user}</span>
          <span class="text-[10px] font-medium ${roleColor}">${s.role}</span>
          ${locked ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-500 font-semibold">LOCKED</span>' : ''}
        </div>
        <p class="text-[10px] text-gray-400">${s.ip} · ${s.location} · ${dur}</p>
      </div>
      <div class="flex gap-1.5 shrink-0">
        ${s.role !== 'admin' ? `<button onclick="socToggleLock('${s.user}')"
          class="px-2 py-1 text-[10px] font-semibold rounded-lg transition ${locked ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-500 hover:bg-red-200'}">
          <i class="fas ${locked?'fa-lock-open':'fa-lock'} mr-0.5"></i>${locked?'Unlock':'Lock'}
        </button>` : '<span class="px-2 py-1 text-[10px] text-gray-400 italic">Protected</span>'}
        <button onclick="socTerminateSession('${s.id}')"
          class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition">
          <i class="fas fa-xmark mr-0.5"></i>End
        </button>
      </div>
    </div>`;
  }).join('') || '<p class="text-gray-400 text-xs text-center py-6">No active sessions</p>';
}

function socToggleLock(username) {
  const targetSession = _socSessions.find(s => s.user === username);
  if (targetSession && targetSession.role === 'admin') {
    showToast('Admin accounts cannot be locked', 'error');
    return;
  }
  if (_lockedAccounts.has(username)) {
    _lockedAccounts.delete(username);
    showToast(`Account "${username}" unlocked`, 'success');
  } else {
    _lockedAccounts.add(username);
    showToast(`Account "${username}" locked`, 'warning');
  }
  renderActiveSessions();
}

function socTerminateSession(sessionId) {
  const idx = _socSessions.findIndex(s=>s.id===sessionId);
  if (idx===-1) return;
  const user = _socSessions[idx].user;
  _socSessions.splice(idx,1);
  renderActiveSessions();
  showToast(`Session for "${user}" terminated`, 'info');
}

function _formatDuration(ms) {
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h>0) return `${h}h ${m%60}m`;
  if (m>0) return `${m}m`;
  return `${s}s`;
}

// ============================================================
// SOC — Vulnerability Tracker
// ============================================================
const _socVulns = [
  { id:'CVE-2024-0001', title:'Dependency: lodash prototype pollution',       severity:'high',     status:'patched',      component:'npm/lodash' },
  { id:'CVE-2024-1234', title:'SQLite: integer overflow in FTS5',             severity:'medium',   status:'mitigated',    component:'SQLite 3.44' },
  { id:'CVE-2024-5678', title:'Flask-CORS misconfiguration allows wildcard',  severity:'high',     status:'open',         component:'flask-cors' },
  { id:'CVE-2023-9999', title:'OpenSSL: NULL pointer dereference',            severity:'critical', status:'open',         component:'OpenSSL 3.x' },
  { id:'CVE-2024-2233', title:'JWT: weak secret allows token forgery',        severity:'critical', status:'investigating', component:'PyJWT' },
  { id:'INT-001',       title:'Admin panel exposed on public network',         severity:'high',     status:'open',         component:'nginx config' },
  { id:'INT-002',       title:'Rate limiting not enforced on /api/kyc',       severity:'medium',   status:'open',         component:'Flask routes' },
];

function renderVulnerabilities() {
  const el = document.getElementById('socVulnList');
  if (!el) return;
  const open = _socVulns.filter(v=>v.status==='open'||v.status==='investigating').length;
  _setText('socVulnSummary', `${open} open · ${_socVulns.length} total`);
  const sevColor = { critical:'border-red-400 bg-red-50', high:'border-orange-400 bg-orange-50', medium:'border-yellow-400 bg-yellow-50', low:'border-green-400 bg-green-50' };
  const stColor  = { open:'bg-red-100 text-red-600', investigating:'bg-blue-100 text-blue-600', mitigated:'bg-yellow-100 text-yellow-700', patched:'bg-green-100 text-green-600' };
  el.innerHTML = _socVulns.map((v,i) => `
    <div class="flex items-start gap-3 p-3 rounded-lg border-l-2 ${sevColor[v.severity]||'border-gray-300 bg-gray-50'}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] font-mono text-gray-400">${v.id}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${stColor[v.status]||''}">${v.status}</span>
        </div>
        <p class="text-xs font-medium text-gray-800 mt-0.5 leading-tight">${v.title}</p>
        <p class="text-[10px] text-gray-400">${v.component}</p>
      </div>
      ${v.status==='open'||v.status==='investigating' ? `
      <button onclick="socPatchVuln(${i})" class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition shrink-0">
        <i class="fas fa-wrench mr-0.5"></i>Patch
      </button>` : ''}
    </div>`).join('');
}

function socPatchVuln(idx) {
  _socVulns[idx].status = 'patched';
  renderVulnerabilities();
  showToast(`${_socVulns[idx].id} marked as patched`, 'success');
}

// ============================================================
// SOC — API Abuse Monitor
// ============================================================
const _socApiAbuse = [
  { endpoint:'/api/kyc/submit',       ip:'185.220.101.34', hits:247, limit:10,  window:'1h',  blocked:true  },
  { endpoint:'/api/auth/login',       ip:'45.155.205.233', hits:189, limit:5,   window:'5m',  blocked:true  },
  { endpoint:'/api/settlements',      ip:'103.21.244.0',   hits:92,  limit:100, window:'1h',  blocked:false },
  { endpoint:'/api/beneficiaries',    ip:'198.54.117.200', hits:67,  limit:50,  window:'15m', blocked:false },
  { endpoint:'/api/defi/swap',        ip:'77.83.0.1',      hits:54,  limit:20,  window:'1h',  blocked:false },
  { endpoint:'/api/fraud/alerts',     ip:'89.248.165.22',  hits:41,  limit:30,  window:'1h',  blocked:false },
];

function renderApiAbuse() {
  const el = document.getElementById('socApiAbuse');
  if (!el) return;
  el.innerHTML = _socApiAbuse.map((a,i) => {
    const pct = Math.min(100, Math.round(a.hits/a.limit*100));
    const barColor = pct>=200?'#ef4444':pct>=100?'#f97316':'#eab308';
    return `<div class="p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-mono text-gray-700 truncate flex-1">${a.endpoint}</span>
        ${a.blocked
          ? '<span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-500 shrink-0">BLOCKED</span>'
          : `<button onclick="socBlockAbuser(${i})" class="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition shrink-0">Block IP</button>`}
      </div>
      <div class="flex items-center gap-2 text-[10px] text-gray-400 mb-1.5">
        <span>${a.ip}</span><span>·</span><span>${a.hits} hits / ${a.limit} limit per ${a.window}</span>
      </div>
      <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div class="h-full rounded-full" style="width:${Math.min(100,pct)}%;background:${barColor}"></div>
      </div>
    </div>`;
  }).join('');
}

function socBlockAbuser(idx) {
  const ip = _socApiAbuse[idx].ip;
  _socApiAbuse[idx].blocked = true;
  if (!_socBlockedIPs.includes(ip)) _socBlockedIPs.push(ip);
  _setText('socKpiBlocked', _socBlockedIPs.length);
  _renderBlocklist();
  renderApiAbuse();
  showToast(`IP ${ip} blocked`, 'warning');
}

// ============================================================
// SOC — Privileged Access Log
// ============================================================
const _socPrivLog = [
  { user:'admin',      action:'Exported full audit log',             ts: Date.now()-1800000,  risk:'medium' },
  { user:'admin',      action:'Modified user role: client_a → operator', ts: Date.now()-3200000, risk:'high' },
  { user:'operator1',  action:'Approved HITL settlement $48,200',    ts: Date.now()-5400000,  risk:'medium' },
  { user:'admin',      action:'Deleted KYC record: entity_0042',     ts: Date.now()-7200000,  risk:'high' },
  { user:'compliance', action:'Accessed SAR report INC-2024-0031',   ts: Date.now()-9000000,  risk:'low' },
  { user:'admin',      action:'Updated sanctions list (247 entries)', ts: Date.now()-14400000, risk:'medium' },
  { user:'operator1',  action:'Reset password for client_b',         ts: Date.now()-18000000, risk:'medium' },
];

function renderPrivAccessLog() {
  const el = document.getElementById('socPrivAccessLog');
  if (!el) return;
  const riskColor = { high:'text-red-500', medium:'text-orange-400', low:'text-green-500' };
  el.innerHTML = _socPrivLog.map(l => `
    <div class="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <i class="fas fa-circle text-[6px] mt-1.5 ${riskColor[l.risk]||'text-gray-400'} shrink-0"></i>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-gray-800 leading-tight">${l.action}</p>
        <p class="text-[10px] text-gray-400">${l.user} · ${_formatDuration(Date.now()-l.ts)} ago</p>
      </div>
      <span class="text-[10px] font-semibold ${riskColor[l.risk]||''} shrink-0">${l.risk}</span>
    </div>`).join('');
}

// ============================================================
// Security / E-KYC
// ============================================================
async function loadKYCStatus() {
  try {
    const data = await apiFetch('/api/kyc/status');
    if (data.doc_status === 'verified') {
      document.getElementById('kycNotStarted').classList.add('hidden');
      document.getElementById('kycVerified').classList.remove('hidden');
      document.getElementById('kycScore').textContent = `Verification Score: ${data.verification_score}%`;
      document.getElementById('kycDocInfo').textContent = `Document: ${(data.doc_type||'').replace('_',' ')} • Verified: ${data.verified_at ? new Date(data.verified_at).toLocaleDateString() : 'N/A'}`;
    }
  } catch (e) { console.error(e); }
}

function onKycFileSelected(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    document.getElementById('kycFileName').textContent = file.name;
    document.getElementById('kycFileInfo').classList.remove('hidden');
    document.getElementById('kycDropZone').classList.add('hidden');
    const btn = document.getElementById('kycBtn');
    btn.disabled = false;
    btn.className = 'w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm';
    btn.innerHTML = '<i class="fas fa-shield-check mr-2"></i>Verify Identity';
  }
}

function clearKycFile() {
  document.getElementById('kycFileInput').value = '';
  document.getElementById('kycFileInfo').classList.add('hidden');
  document.getElementById('kycDropZone').classList.remove('hidden');
  const btn = document.getElementById('kycBtn');
  btn.disabled = true;
  btn.className = 'w-full py-2.5 rounded-lg bg-blue-600/40 text-white/50 font-semibold cursor-not-allowed transition text-sm';
  btn.innerHTML = '<i class="fas fa-shield-check mr-2"></i>Upload document first';
}

async function submitKYC() {
  const fileInput = document.getElementById('kycFileInput');
  if (!fileInput.files.length) {
    alert('Please upload a document first.');
    return;
  }
  document.getElementById('kycNotStarted').classList.add('hidden');
  document.getElementById('kycVerifying').classList.remove('hidden');
  try {
    const formData = new FormData();
    formData.append('document', fileInput.files[0]);
    formData.append('doc_type', document.getElementById('kycDocType').value);

    const resp = await fetch(API + '/api/kyc/submit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body: formData
    });
    const result = await resp.json();

    setTimeout(() => {
      document.getElementById('kycVerifying').classList.add('hidden');
      document.getElementById('kycVerified').classList.remove('hidden');

      const iconDiv = document.getElementById('kycResultIcon');
      const titleEl = document.getElementById('kycResultTitle');
      const scoreEl = document.getElementById('kycScore');
      const infoEl = document.getElementById('kycDocInfo');
      const detailsDiv = document.getElementById('kycDetails');
      const retryBtn = document.getElementById('kycRetryBtn');

      if (result.status === 'verified') {
        iconDiv.className = 'w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4';
        iconDiv.innerHTML = '<i class="fas fa-check-circle text-3xl text-green-400"></i>';
        titleEl.textContent = 'Identity Verified';
        titleEl.className = 'text-gray-800 font-semibold mb-1';
        scoreEl.textContent = `Verification Score: ${result.score}%`;
        scoreEl.className = 'text-accent text-sm mb-2';
        retryBtn.classList.add('hidden');
      } else if (result.status === 'review') {
        iconDiv.className = 'w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4';
        iconDiv.innerHTML = '<i class="fas fa-exclamation-triangle text-3xl text-yellow-400"></i>';
        titleEl.textContent = 'Manual Review Required';
        titleEl.className = 'text-yellow-400 font-semibold mb-1';
        scoreEl.textContent = `Verification Score: ${result.score}% (threshold: 70%)`;
        scoreEl.className = 'text-yellow-400 text-sm mb-2';
        retryBtn.classList.remove('hidden');
      } else {
        iconDiv.className = 'w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4';
        iconDiv.innerHTML = '<i class="fas fa-times-circle text-3xl text-red-400"></i>';
        titleEl.textContent = 'Verification Failed';
        titleEl.className = 'text-red-400 font-semibold mb-1';
        scoreEl.textContent = `Score: ${result.score}%`;
        scoreEl.className = 'text-red-400 text-sm mb-2';
        retryBtn.classList.remove('hidden');
      }

      infoEl.textContent = result.message || '';

      if (result.details) {
        detailsDiv.classList.remove('hidden');
        document.getElementById('kycDetDocType').textContent = result.details.document_detected ? '✅ Yes' : '❌ No';
        document.getElementById('kycDetExtName').textContent = result.details.extracted_name || '—';
        document.getElementById('kycDetExpName').textContent = result.details.expected_name || '—';
        document.getElementById('kycDetMatchType').textContent = result.details.name_match_type || 'none';
        document.getElementById('kycDetDocScore').textContent = (result.details.doc_score || 0) + '/40';
        document.getElementById('kycDetNameScore').textContent = (result.details.name_score || 0) + '/50';
        document.getElementById('kycDetTotalScore').textContent = result.score + '/100';
      }
    }, 2500);
  } catch (e) {
    document.getElementById('kycVerifying').classList.add('hidden');
    document.getElementById('kycNotStarted').classList.remove('hidden');
    alert(e.message || 'Verification failed');
  }
}

function resetKYC() {
  document.getElementById('kycVerified').classList.add('hidden');
  document.getElementById('kycNotStarted').classList.remove('hidden');
  document.getElementById('kycDetails').classList.add('hidden');
  clearKycFile();
}

async function loadFraudAlerts() {
  try {
    const data = await apiFetch('/api/fraud/alerts');
    const div = document.getElementById('fraudAlertsList');
    if (!data.alerts.length) { div.innerHTML = '<p class="text-gray-600 text-sm text-center py-4">No fraud alerts</p>'; return; }
    div.innerHTML = data.alerts.slice(0, 8).map(a => `<div class="bg-gray-100 rounded-lg p-3 border-l-2 ${a.severity === 'critical' ? 'border-red-500' : 'border-orange-500'}">
      <div class="flex justify-between"><span class="text-gray-800 text-xs font-medium">${a.beneficiary}</span><span class="badge ${a.severity === 'critical' ? 'severity-critical' : 'severity-high'}">${a.severity}</span></div>
      <p class="text-gray-500 text-xs mt-1">$${Number(a.amount).toLocaleString()} • Risk: ${a.risk_score} • ${a.reason}</p>
    </div>`).join('');
  } catch (e) { console.error(e); }
}

// ============================================================
// Documents
// ============================================================
async function loadDocuments() {
  try {
    const data = await apiFetch('/api/documents');
    const div = document.getElementById('documentsList');
    const docs = data.documents || [];
    if (!docs.length) { div.innerHTML = '<p class="text-gray-600 text-sm text-center py-8">No documents available.</p>'; return; }
    const icons = { statement: 'fa-file-lines text-blue-400', tax_1099: 'fa-file-invoice-dollar text-green-400', receipt: 'fa-receipt text-purple-400' };
    div.innerHTML = docs.map(d => {
      const icon = icons[d.type] || 'fa-file text-gray-400';
      const escapedTitle = d.title.replace(/'/g, "\\'");
      const escapedMeta  = (d.description + ' \u2022 ' + d.size + ' \u2022 ' + d.format).replace(/'/g, "\\'");
      return '<div class="bg-gray-100 rounded-lg p-4 flex items-center justify-between hover:bg-gray-200 transition">' +
        '<div class="flex items-center gap-3">' +
          '<div class="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center"><i class="fas ' + icon + '"></i></div>' +
          '<div><p class="text-gray-800 text-sm font-medium">' + d.title + '</p>' +
          '<p class="text-gray-500 text-xs">' + d.description + ' \u2022 ' + d.size + ' \u2022 ' + d.format + '</p></div>' +
        '</div>' +
        '<div class="flex gap-2">' +
          '<button onclick="previewDoc(\'' + d.id + '\',\'' + escapedTitle + '\',\'' + escapedMeta + '\',\'' + icon + '\')" ' +
            'class="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-300 transition">' +
            '<i class="fas fa-eye mr-1"></i>View</button>' +
          '<button onclick="downloadDoc(\'' + d.id + '\')" ' +
            'class="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition">' +
            '<i class="fas fa-download mr-1"></i>Download</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) { console.error(e); }
}

function downloadDoc(id) {
  window.open(API + '/api/documents/' + id + '/download?token=' + TOKEN, '_blank');
}

function previewDoc(id, title, meta, icon) {
  const url = API + '/api/documents/' + id + '/download?token=' + TOKEN;
  document.getElementById('docPreviewTitle').textContent = title;
  document.getElementById('docPreviewMeta').textContent = meta;
  document.getElementById('docPreviewIcon').innerHTML = '<i class="fas ' + icon + ' text-lg"></i>';
  document.getElementById('docPreviewFrame').src = url;
  document.getElementById('docPreviewDownloadBtn').onclick = function() { downloadDoc(id); };
  document.getElementById('docPreviewModal').classList.remove('hidden');
}

function closeDocPreview() {
  document.getElementById('docPreviewModal').classList.add('hidden');
  document.getElementById('docPreviewFrame').src = '';
}
