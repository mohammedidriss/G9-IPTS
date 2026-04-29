// ============================================================
// tab-network.js — Network tab: Node Network, Explorer, Locations
// ============================================================

const NODE_TYPE_COLOR = { validator: '#6366f1', full_node: '#10b981', relay: '#f59e0b', light: '#64748b' };
const NODE_TYPE_LABEL = { validator: 'Validator', full_node: 'Full Node', relay: 'Relay', light: 'Light' };
const NODE_STATUS_COLOR = { online: '#22c55e', syncing: '#3b82f6', degraded: '#f59e0b', offline: '#ef4444' };
const NODE_R = { validator: 14, full_node: 11, relay: 9, light: 7 };

let _networkData = null;
let _nodeExplorerFilter = '';

function switchNetworkSub(sub) {
  const subNorm = sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
  ['Network','Explorer','Locations'].forEach(s => {
    const panel = document.getElementById('netSub' + s);
    const btn = document.getElementById('netSubBtn' + s);
    if (panel) panel.classList.toggle('hidden', s !== subNorm);
    if (btn) {
      btn.className = s === subNorm
        ? 'px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-white transition'
        : 'px-4 py-2 text-xs font-semibold rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition';
    }
  });
  if (subNorm === 'Network') loadNetworkData();
  if (subNorm === 'Explorer') { if (_networkData) renderNodeExplorer(_networkData.nodes); else loadNetworkData().then(() => renderNodeExplorer(_networkData.nodes)); }
  if (subNorm === 'Locations') { if (_networkData) renderNodeLocationMap(_networkData.nodes); else loadNetworkData().then(() => renderNodeLocationMap(_networkData.nodes)); }
}

async function loadNetworkData() {
  if (_networkData) return _networkData;
  try {
    _networkData = await apiFetch('/api/network/node-health');
    _updateNetworkKPIs(_networkData.nodes);
    _renderNetworkGraph(_networkData);
    return _networkData;
  } catch(e) {
    console.error('Network data error:', e);
  }
}

function _updateNetworkKPIs(nodes) {
  const counts = { total: nodes.length, online: 0, degraded: 0, syncing: 0, offline: 0 };
  nodes.forEach(n => { if (counts[n.status] !== undefined) counts[n.status]++; });
  ['Total','Online','Degraded','Syncing','Offline'].forEach(k => {
    const el = document.getElementById('nkpi' + k);
    if (el) el.textContent = counts[k.toLowerCase()];
  });
}

function networkGraphFilter() {
  if (_networkData) _renderNetworkGraph(_networkData);
}

function _renderNetworkGraph(data) {
  const typeFilter = document.getElementById('netFilterType') ? document.getElementById('netFilterType').value : 'all';
  const statusFilter = document.getElementById('netFilterStatus') ? document.getElementById('netFilterStatus').value : 'all';
  
  let nodes = data.nodes.filter(n => 
    (typeFilter === 'all' || n.type === typeFilter) &&
    (statusFilter === 'all' || n.status === statusFilter)
  ).map(n => ({...n}));
  
  const nodeIds = new Set(nodes.map(n => n.id));
  let links = (data.links || []).filter(l => nodeIds.has(l.source) && nodeIds.has(l.target)).map(l => ({...l}));

  const container = document.getElementById('networkGraphContainer');
  if (!container) return;
  container.innerHTML = '';
  const W = container.clientWidth || 800, H = 520;
  
  const svg = d3.select(container).append('svg').attr('width', W).attr('height', H)
    .style('background', '#0f172a').style('border-radius', '8px');
  const g = svg.append('g');
  
  svg.call(d3.zoom().scaleExtent([0.3, 4]).on('zoom', e => g.attr('transform', e.transform)));
  
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(70).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-180))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collision', d3.forceCollide().radius(d => NODE_R[d.type] + 6));

  const link = g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', '#334155').attr('stroke-width', 1.5).attr('stroke-opacity', 0.6);

  const nodeG = g.append('g').selectAll('g').data(nodes).join('g').attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag', (e, d) => { d.fx=e.x; d.fy=e.y; })
      .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; }));

  nodeG.append('circle')
    .attr('r', d => NODE_R[d.type] || 9)
    .attr('fill', d => NODE_TYPE_COLOR[d.type] || '#64748b')
    .attr('stroke', d => NODE_STATUS_COLOR[d.status] || '#22c55e')
    .attr('stroke-width', 3);

  nodeG.append('circle').attr('r', 4)
    .attr('fill', d => NODE_STATUS_COLOR[d.status] || '#22c55e')
    .attr('cy', d => -(NODE_R[d.type] || 9) - 2);

  nodeG.append('text').attr('text-anchor', 'middle').attr('dy', d => (NODE_R[d.type]||9) + 14)
    .attr('fill', '#94a3b8').attr('font-size', '9px').text(d => d.id.replace('node_',''));

  const tooltip = d3.select(container).append('div')
    .style('position','absolute').style('background','#1e293b').style('border','1px solid #334155')
    .style('padding','10px 14px').style('border-radius','8px').style('font-size','11px')
    .style('color','#e2e8f0').style('pointer-events','none').style('opacity',0).style('z-index',100)
    .style('max-width','200px');

  nodeG.on('mouseover', (e, d) => {
    tooltip.style('opacity',1).html(
      `<div style="font-weight:700;margin-bottom:4px;color:${NODE_TYPE_COLOR[d.type]}">${d.id}</div>` +
      `<div>Type: <span style="color:#e2e8f0">${NODE_TYPE_LABEL[d.type]||d.type}</span></div>` +
      `<div>Status: <span style="color:${NODE_STATUS_COLOR[d.status]}">${d.status}</span></div>` +
      `<div>Country: ${d.country||'—'}</div>` +
      `<div>Latency: ${d.latency_ms||'—'} ms</div>` +
      `<div>Peers: ${d.peer_count||0}</div>`
    );
  }).on('mousemove', e => {
    tooltip.style('left',(e.offsetX+14)+'px').style('top',(e.offsetY-20)+'px');
  }).on('mouseout', () => tooltip.style('opacity',0));

  simulation.on('tick', () => {
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    nodeG.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  const legend = svg.append('g').attr('transform','translate(12,12)');
  Object.entries(NODE_TYPE_COLOR).forEach(([type, color], i) => {
    const lg = legend.append('g').attr('transform', `translate(0,${i*18})`);
    lg.append('circle').attr('r',6).attr('fill',color).attr('cx',6).attr('cy',6);
    lg.append('text').attr('x',16).attr('y',10).attr('fill','#94a3b8').attr('font-size','10px').text(NODE_TYPE_LABEL[type]);
  });
}

// ---- Role helper ----
function _isAdminOrOperator() {
  const role = (localStorage.getItem('ipts_role') || '').toLowerCase();
  return role === 'admin' || role === 'operator';
}

// ---- Node Explorer ----
function renderNodeExplorer(nodes) {
  // Read all filter values
  const q          = ((document.getElementById('nodeSearchInput')||{}).value||'').toLowerCase().trim();
  const typeFilter = ((document.getElementById('nodeTypeFilter')||{}).value||'');
  const statFilter = ((document.getElementById('nodeStatusFilter')||{}).value||'');
  const regFilter  = ((document.getElementById('nodeRegionFilter')||{}).value||'');

  // Populate region dropdown once (keep current selection)
  const regSel = document.getElementById('nodeRegionFilter');
  if (regSel && regSel.options.length <= 1) {
    const regions = [...new Set(nodes.map(n => n.region || n.country || '').filter(Boolean))].sort();
    regions.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r;
      regSel.appendChild(opt);
    });
  }

  const filtered = nodes.filter(n => {
    const nodeRegion = n.region || n.country || '';
    const nodeType   = n.node_type || n.type || '';
    if (q && !( (n.node_id||n.id||'').toLowerCase().includes(q) ||
                nodeRegion.toLowerCase().includes(q) ||
                nodeType.toLowerCase().includes(q) )) return false;
    if (typeFilter && nodeType !== typeFilter) return false;
    if (statFilter && n.status !== statFilter) return false;
    if (regFilter  && nodeRegion !== regFilter) return false;
    return true;
  });

  const tbody = document.getElementById('nodeExplorerBody');
  if (!tbody) return;

  const countEl = document.getElementById('nodeExplorerCount');
  if (countEl) countEl.textContent = `${filtered.length} / ${nodes.length} nodes`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400 text-sm">No nodes match the current filters</td></tr>`;
    return;
  }

  const nodeType = n => n.node_type || n.type || '';
  const nodeId   = n => n.node_id || n.id || '';

  tbody.innerHTML = filtered.map(n => `
    <tr class="hover:bg-white/5 cursor-pointer border-b border-white/5" onclick="openNodeModal('${nodeId(n)}')">
      <td class="px-4 py-3 text-xs font-mono text-gray-300">${nodeId(n)}</td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs font-semibold" style="background:${NODE_TYPE_COLOR[nodeType(n)]}22;color:${NODE_TYPE_COLOR[nodeType(n)]}">${NODE_TYPE_LABEL[nodeType(n)]||nodeType(n)}</span></td>
      <td class="px-4 py-3"><span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full inline-block" style="background:${NODE_STATUS_COLOR[n.status]}"></span><span class="text-xs text-gray-300 capitalize">${n.status}</span></span></td>
      <td class="px-4 py-3 text-xs text-gray-300">${n.region || n.country||'—'}</td>
      <td class="px-4 py-3 text-xs text-gray-300">${n.latency_ms||'—'} ms</td>
      <td class="px-4 py-3 text-xs text-gray-300">${n.peer_count||0}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${n.uptime_pct != null ? n.uptime_pct : (n.uptime != null ? n.uptime : '—')}%</td>
      <td class="px-4 py-3">
        ${_isAdminOrOperator() ? `
        <button onclick="event.stopPropagation();openNodeModal('${nodeId(n)}')"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 transition flex items-center gap-1.5">
          <i class="fas fa-cog"></i> Actions
        </button>` : `<span class="text-xs text-gray-400 italic">View only</span>`}
      </td>
    </tr>`).join('');
}

function filterNodeExplorer() {
  if (_networkData) renderNodeExplorer(_networkData.nodes);
}

// ---- Node Action Modal ----
function openNodeModal(nodeId) {
  if (!_isAdminOrOperator()) {
    showToast('Node actions are restricted to Admin and Operator roles', 'error');
    return;
  }
  const n = _networkData && _networkData.nodes.find(x => (x.node_id||x.id) === nodeId);
  if (!n) return;

  // Build or reuse modal
  let modal = document.getElementById('nodeActionModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'nodeActionModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);';
    modal.onclick = e => { if (e.target === modal) closeNodeModal(); };
    document.body.appendChild(modal);
  }

  const statusColor = NODE_STATUS_COLOR[n.status] || '#64748b';
  const typeColor   = NODE_TYPE_COLOR[n.type]   || '#64748b';
  const typeLabel   = NODE_TYPE_LABEL[n.type]   || n.type;

  modal.innerHTML = `
    <div style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:100%;max-width:480px;box-shadow:0 25px 60px rgba(0,0,0,0.5);overflow:hidden;">

      <!-- Header -->
      <div style="background:#0f172a;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:10px;background:${typeColor}22;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-server" style="color:${typeColor};font-size:16px;"></i>
          </div>
          <div>
            <div style="color:#f1f5f9;font-weight:700;font-size:15px;">${n.id}</div>
            <div style="color:#64748b;font-size:11px;">${typeLabel} &nbsp;·&nbsp; ${n.country||'Unknown'}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${statusColor}22;color:${statusColor};text-transform:capitalize;">${n.status}</span>
          <button onclick="closeNodeModal()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer;line-height:1;padding:2px 6px;" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#64748b'">&times;</button>
        </div>
      </div>

      <!-- Stats grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1px;background:rgba(255,255,255,0.05);margin:0;">
        ${[
          ['Latency',      (n.latency_ms||'—') + ' ms', '#38bdf8'],
          ['Peers',        n.peer_count||0,              '#a78bfa'],
          ['Uptime',       (n.uptime_pct||'—') + '%',   '#34d399'],
          ['Block Height', n.block_height||'—',          '#fb923c'],
        ].map(([label, val, col]) => `
          <div style="background:#1e293b;padding:16px 14px;text-align:center;">
            <div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${label}</div>
            <div style="color:${col};font-weight:700;font-size:16px;">${val}</div>
          </div>`).join('')}
      </div>

      <!-- Actions -->
      <div style="padding:20px 24px;">
        <div style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Node Actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button onclick="nodeAction('${n.id}','restart');updateNodeModalStatus('Restart command sent')"
            style="padding:12px;border:none;border-radius:10px;background:#1d4ed8;color:#fff;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.15s;"
            onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#1d4ed8'">
            <i class="fas fa-redo-alt"></i> Restart Node
          </button>
          <button onclick="nodeAction('${n.id}','shutdown');updateNodeModalStatus('Shutdown command sent')"
            style="padding:12px;border:none;border-radius:10px;background:#dc2626;color:#fff;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.15s;"
            onmouseover="this.style.background='#ef4444'" onmouseout="this.style.background='#dc2626'">
            <i class="fas fa-power-off"></i> Shutdown
          </button>
          <button onclick="nodeAction('${n.id}','ping');updateNodeModalStatus('Ping sent — awaiting response…')"
            style="padding:12px;border:none;border-radius:10px;background:#334155;color:#e2e8f0;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.15s;"
            onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'">
            <i class="fas fa-satellite-dish"></i> Ping
          </button>
          <button onclick="nodeAction('${n.id}','sync');updateNodeModalStatus('Force sync initiated')"
            style="padding:12px;border:none;border-radius:10px;background:#065f46;color:#6ee7b7;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.15s;"
            onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#065f46'">
            <i class="fas fa-sync-alt"></i> Force Sync
          </button>
        </div>

        <!-- Status feedback bar -->
        <div id="nodeModalStatusBar" style="margin-top:14px;padding:10px 14px;border-radius:8px;background:#0f172a;border:1px solid rgba(255,255,255,0.06);color:#64748b;font-size:11.5px;min-height:38px;display:flex;align-items:center;gap:8px;">
          <i class="fas fa-info-circle" style="color:#3b82f6;"></i>
          <span>Click an action to execute on this node.</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:12px 24px 18px;display:flex;justify-content:flex-end;border-top:1px solid rgba(255,255,255,0.05);">
        <button onclick="closeNodeModal()"
          style="padding:8px 20px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;"
          onmouseover="this.style.background='#334155';this.style.color='#e2e8f0'" onmouseout="this.style.background='transparent';this.style.color='#94a3b8'">
          Close
        </button>
      </div>
    </div>`;

  modal.style.display = 'flex';
}

function updateNodeModalStatus(msg) {
  const bar = document.getElementById('nodeModalStatusBar');
  if (!bar) return;
  bar.innerHTML = `<i class="fas fa-check-circle" style="color:#22c55e;"></i><span style="color:#e2e8f0;">${msg}</span>`;
  setTimeout(() => {
    if (bar) bar.innerHTML = `<i class="fas fa-info-circle" style="color:#3b82f6;"></i><span>Click an action to execute on this node.</span>`;
  }, 3000);
}

function closeNodeModal() {
  const modal = document.getElementById('nodeActionModal');
  if (modal) modal.style.display = 'none';
}

// Keep legacy aliases so nothing else breaks
function openNodeDetail(nodeId) { openNodeModal(nodeId); }
function closeNodeDetail() { closeNodeModal(); }

function nodeAction(nodeId, action) {
  showToast(`${action.charAt(0).toUpperCase()+action.slice(1)} sent to ${nodeId}`, 'info');
}

// ---- Node Location Map ----
const NODE_COUNTRY_COORDS = {
  // ISO codes
  'US': [37.09, -95.71], 'DE': [51.16, 10.45], 'SG': [1.35, 103.82],
  'JP': [36.20, 138.25], 'GB': [55.38, -3.44], 'AU': [-25.27, 133.77],
  'BR': [-14.24, -51.93], 'IN': [20.59, 78.96], 'AE': [23.42, 53.85],
  'SA': [23.89, 45.08], 'CA': [56.13, -106.35], 'NG': [9.08, 8.68],
  'ZA': [-30.56, 22.94], 'MX': [23.63, -102.55], 'PH': [12.88, 121.77],
  'PK': [30.37, 69.34], 'NP': [28.39, 84.12], 'ID': [-0.79, 113.92],
  'KR': [35.91, 127.77], 'QA': [25.35, 51.18], 'LB': [33.85, 35.86],
  'FR': [46.23, 2.21], 'CN': [35.86, 104.19], 'ZW': [-19.02, 29.15],
  'TZ': [-6.37, 34.89],
  // Full names
  'USA': [37.09, -95.71], 'Germany': [51.16, 10.45], 'Singapore': [1.35, 103.82],
  'Japan': [36.20, 138.25], 'UK': [55.38, -3.44], 'Australia': [-25.27, 133.77],
  'Brazil': [-14.24, -51.93], 'India': [20.59, 78.96], 'UAE': [23.42, 53.85],
  'Saudi Arabia': [23.89, 45.08], 'Canada': [56.13, -106.35], 'Nigeria': [9.08, 8.68],
  'South Africa': [-30.56, 22.94], 'Mexico': [23.63, -102.55], 'Philippines': [12.88, 121.77],
  'Pakistan': [30.37, 69.34], 'Nepal': [28.39, 84.12], 'Indonesia': [-0.79, 113.92],
  'South Korea': [35.91, 127.77], 'Qatar': [25.35, 51.18], 'Lebanon': [33.85, 35.86],
  'France': [46.23, 2.21], 'China': [35.86, 104.19], 'Zimbabwe': [-19.02, 29.15],
  'Tanzania': [-6.37, 34.89],
  // Region aliases used by node data
  'KSA': [23.89, 45.08], 'GCC': [25.28, 51.51], 'Levant': [33.85, 35.86],
  'Asia': [34.05, 100.62], 'Europe': [48.52, 15.25], 'Americas': [10.0, -84.0]
};

async function renderNodeLocationMap(nodes) {
  const container = document.getElementById('nodeLocationMapContainer');
  if (!container) return;
  container.innerHTML = '<div class="text-gray-400 text-sm p-4">Loading map…</div>';

  try {
    const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    const topo = topojson.feature(world, world.objects.countries);

    const W = container.clientWidth || 800, H = 420;
    container.innerHTML = '';
    container.style.position = 'relative';

    const svg = d3.select(container).append('svg').attr('width', W).attr('height', H)
      .style('background', '#0a1628').style('border-radius', '10px').style('display','block');

    const defs = svg.append('defs');
    // Glow filter for node pins
    const glow = defs.append('filter').attr('id','nlGlow').attr('x','-80%').attr('y','-80%').attr('width','260%').attr('height','260%');
    glow.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation','3').attr('result','blur');
    const fm = glow.append('feMerge');
    fm.append('feMergeNode').attr('in','blur');
    fm.append('feMergeNode').attr('in','SourceGraphic');

    const projection = d3.geoMercator().fitExtent([[10,10],[W-10,H-10]], topo);
    const path = d3.geoPath().projection(projection);
    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([1,10]).on('zoom', e => g.attr('transform', e.transform)));

    // Base world map
    g.append('g').selectAll('path').data(topo.features).join('path')
      .attr('d', path).attr('fill', '#1a2744').attr('stroke', '#253554').attr('stroke-width', 0.5);

    // Tooltip
    const tooltip = d3.select(container).append('div')
      .style('position','absolute').style('background','rgba(15,23,42,0.95)')
      .style('border','1px solid #3b82f6').style('padding','10px 14px')
      .style('border-radius','8px').style('font-size','11px').style('color','#e2e8f0')
      .style('pointer-events','none').style('opacity',0).style('z-index',200)
      .style('max-width','220px').style('line-height','1.6');

    // Group by region for cluster halos
    const byRegion = {};
    nodes.forEach(n => {
      const c = n.region || n.country || 'Unknown';
      if (!byRegion[c]) byRegion[c] = [];
      byRegion[c].push(n);
    });

    // Draw region cluster halo rings
    Object.entries(byRegion).forEach(([region, rnodes]) => {
      const coords = NODE_COUNTRY_COORDS[region];
      if (!coords) return;
      const [lat, lng] = coords;
      const [px, py] = projection([lng, lat]);
      if (!px || !py) return;
      const dominant = rnodes.reduce((acc, n) => { acc[n.status] = (acc[n.status]||0)+1; return acc; }, {});
      const topStatus = Object.entries(dominant).sort((a,b)=>b[1]-a[1])[0][0];
      const r = 14 + rnodes.length * 5;
      // Outer soft halo
      g.append('circle').attr('cx', px).attr('cy', py).attr('r', r)
        .attr('fill', NODE_STATUS_COLOR[topStatus] + '18')
        .attr('stroke', NODE_STATUS_COLOR[topStatus] + '55')
        .attr('stroke-width', 1).attr('stroke-dasharray', '4,3');
    });

    // Spread individual nodes around their region center
    Object.entries(byRegion).forEach(([region, rnodes]) => {
      const coords = NODE_COUNTRY_COORDS[region];
      if (!coords) return;
      const [lat, lng] = coords;
      const [cx, cy] = projection([lng, lat]);
      if (!cx || !cy) return;

      const count = rnodes.length;
      rnodes.forEach((n, i) => {
        // Arrange nodes in a small circle around the region center
        const angle = (2 * Math.PI * i) / count - Math.PI / 2;
        const spread = count === 1 ? 0 : Math.min(22, 8 + count * 4);
        const px = cx + spread * Math.cos(angle);
        const py = cy + spread * Math.sin(angle);

        const statusColor = NODE_STATUS_COLOR[n.status] || '#64748b';
        const typeR = { validator: 7, full_node: 6, relay: 5, light: 4 }[n.node_type] || 5;

        // Glow ring
        g.append('circle').attr('cx', px).attr('cy', py).attr('r', typeR + 4)
          .attr('fill', statusColor + '22').attr('stroke', 'none');

        // Node dot
        const dot = g.append('circle').attr('cx', px).attr('cy', py).attr('r', typeR)
          .attr('fill', statusColor).attr('stroke', '#0a1628').attr('stroke-width', 1.5)
          .attr('filter', 'url(#nlGlow)').attr('cursor', 'pointer');

        // Node label (short name)
        const label = (n.node_id || n.name || '').replace(/^node[-_]?/i,'').slice(0,6);
        g.append('text').attr('x', px).attr('y', py + typeR + 10)
          .attr('text-anchor','middle').attr('fill','#94a3b8')
          .attr('font-size','8px').attr('pointer-events','none')
          .text(label);

        // Tooltip
        dot.on('mouseover', e => {
          tooltip.style('opacity',1).html(
            `<div style="font-weight:700;color:#f1f5f9;margin-bottom:4px">${n.node_id || n.name || 'Node'}</div>` +
            `<div><span style="color:#94a3b8">Type:</span> <span style="color:${NODE_TYPE_COLOR[n.node_type]||'#94a3b8'}">${NODE_TYPE_LABEL[n.node_type]||n.node_type||'—'}</span></div>` +
            `<div><span style="color:#94a3b8">Status:</span> <span style="color:${statusColor}">${n.status||'—'}</span></div>` +
            `<div><span style="color:#94a3b8">Region:</span> ${region}</div>` +
            `<div><span style="color:#94a3b8">Uptime:</span> ${n.uptime != null ? n.uptime+'%' : '—'}</div>` +
            `<div><span style="color:#94a3b8">TPS:</span> ${n.tps != null ? n.tps : '—'}</div>`
          );
        })
        .on('mousemove', e => tooltip.style('left',(e.offsetX+16)+'px').style('top',(e.offsetY-10)+'px'))
        .on('mouseout', () => tooltip.style('opacity',0));
      });
    });

    // Legend
    const legend = svg.append('g').attr('transform',`translate(${W-130},12)`);
    legend.append('rect').attr('width',122).attr('height',72).attr('rx',6)
      .attr('fill','rgba(10,22,40,0.85)').attr('stroke','#253554');
    [['online','Online'],['syncing','Syncing'],['degraded','Degraded'],['offline','Offline']].forEach(([s,lbl],i) => {
      legend.append('circle').attr('cx',12).attr('cy',14+i*14).attr('r',4).attr('fill',NODE_STATUS_COLOR[s]);
      legend.append('text').attr('x',22).attr('y',18+i*14).attr('fill','#94a3b8').attr('font-size','10px').text(lbl);
    });

    // Update sidebar list
    const listEl = document.getElementById('nodeLocationCountryList');
    if (listEl) {
      listEl.innerHTML = Object.entries(byRegion).sort((a,b)=>b[1].length-a[1].length).map(([region, rnodes]) => {
        const online = rnodes.filter(n=>n.status==='online').length;
        return `<div class="flex items-center justify-between py-2 border-b border-white/5">
          <span class="text-sm text-gray-200">${region}</span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-green-400">${online} online</span>
            <span class="text-xs text-gray-400">${rnodes.length} total</span>
          </div>
        </div>`;
      }).join('');
    }
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 text-sm p-4">Map error: ${e.message}</div>`;
  }
}
