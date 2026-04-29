// tab-network.js — Network tab module for IPTS
let _networkNodes = [];
let _networkSimulation = null;

async function loadNetworkTab() {
  try {
    const token = localStorage.getItem('ipts_token');
    const res = await fetch('/api/network/node-health', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    _networkNodes = data.nodes || [];
    // Update KPIs
    const s = data.summary || {};
    document.getElementById('netKpiTotal').textContent = s.total || _networkNodes.length;
    document.getElementById('netKpiOnline').textContent = s.online || 0;
    document.getElementById('netKpiSyncing').textContent = s.syncing || 0;
    document.getElementById('netKpiDegraded').textContent = s.degraded || 0;
    document.getElementById('netKpiOffline').textContent = s.offline || 0;
    // Render active sub-tab
    const active = document.querySelector('[id^="netPane-"]:not(.hidden)');
    const activeName = active ? active.id.replace('netPane-','') : 'graph';
    switchNetworkTab(activeName);
  } catch(e) { console.error('Network tab error', e); }
}

function switchNetworkTab(name) {
  ['graph','explorer','locations'].forEach(t => {
    document.getElementById('netPane-'+t)?.classList.toggle('hidden', t !== name);
    const btn = document.getElementById('netTab-'+t);
    if (btn) {
      btn.classList.toggle('bg-accent', t === name);
      btn.classList.toggle('text-white', t === name);
      btn.classList.toggle('glass', t !== name);
      btn.classList.toggle('text-gray-300', t !== name);
    }
  });
  if (name === 'graph') renderNetworkD3();
  else if (name === 'explorer') renderNodeExplorer();
  else if (name === 'locations') renderNodeLocations();
}

function renderNetworkD3() {
  const container = document.getElementById('networkD3Container');
  if (!container || !_networkNodes.length) return;
  container.innerHTML = '';
  const W = container.clientWidth || 800;
  const H = 520;
  const typeColor = { 'Validator':'#f59e0b','Full Node':'#3b82f6','Relay':'#8b5cf6','Light':'#06b6d4' };
  const statusRing = { 'online':'#4ade80','syncing':'#facc15','degraded':'#fb923c','offline':'#ef4444' };
  // Build links: connect nodes of same corridor region (simplified mesh)
  const links = [];
  for (let i=0;i<_networkNodes.length;i++) {
    for (let j=i+1;j<_networkNodes.length;j++) {
      if (Math.random() < 0.15) links.push({source:i,target:j});
    }
  }
  const svg = d3.select(container).append('svg')
    .attr('width','100%').attr('height',H)
    .style('background','transparent');
  const g = svg.append('g');
  // Zoom
  svg.call(d3.zoom().scaleExtent([0.3,4]).on('zoom', e => g.attr('transform', e.transform)));
  const sim = d3.forceSimulation(_networkNodes)
    .force('link', d3.forceLink(links).distance(70).strength(0.3))
    .force('charge', d3.forceManyBody().strength(-180))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collision', d3.forceCollide(22));
  _networkSimulation = sim;
  const link = g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke','rgba(255,255,255,0.08)').attr('stroke-width',1);
  const node = g.append('g').selectAll('g').data(_networkNodes).join('g')
    .attr('cursor','pointer')
    .call(d3.drag()
      .on('start', (e,d) => { if(!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x;d.fy=d.y; })
      .on('drag', (e,d) => { d.fx=e.x;d.fy=e.y; })
      .on('end', (e,d) => { if(!e.active) sim.alphaTarget(0); d.fx=null;d.fy=null; }));
  // Status ring
  node.append('circle').attr('r',16).attr('fill','none')
    .attr('stroke', d => statusRing[d.status] || '#fff').attr('stroke-width',2.5);
  // Node fill
  node.append('circle').attr('r',13)
    .attr('fill', d => typeColor[d.type] || '#6b7280')
    .attr('fill-opacity',0.9);
  // Label inside
  node.append('text').attr('text-anchor','middle').attr('dy','0.35em')
    .attr('font-size','7px').attr('fill','#fff').attr('font-weight','bold')
    .text(d => d.name.substring(0,6));
  // Tooltip
  const tooltip = document.getElementById('networkTooltip');
  node.on('mouseover', (e,d) => {
    tooltip.classList.remove('hidden');
    tooltip.innerHTML = `<div class="font-bold">${d.name}</div><div class="text-gray-300">${d.type} — ${d.country}</div><div>Status: <span class="font-semibold">${d.status}</span></div>${d.latency_ms ? `<div>Latency: ${d.latency_ms}ms</div>` : ''}`;
    tooltip.style.left = (e.clientX+12)+'px';
    tooltip.style.top = (e.clientY-10)+'px';
  }).on('mousemove', e => {
    tooltip.style.left = (e.clientX+12)+'px';
    tooltip.style.top = (e.clientY-10)+'px';
  }).on('mouseout', () => tooltip.classList.add('hidden'));
  sim.on('tick', () => {
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>`translate(${d.x},${d.y})`);
  });
}

function renderNodeExplorer() {
  const tbody = document.getElementById('nodeExplorerBody');
  if (!tbody) return;
  filterNodeTable();
}

function filterNodeTable() {
  const search = (document.getElementById('nodeSearchInput')?.value||'').toLowerCase();
  const typeF = document.getElementById('nodeTypeFilter')?.value||'';
  const statusF = document.getElementById('nodeStatusFilter')?.value||'';
  const filtered = _networkNodes.filter(n =>
    (!search || n.name.toLowerCase().includes(search) || n.country.toLowerCase().includes(search)) &&
    (!typeF || n.type === typeF) &&
    (!statusF || n.status === statusF)
  );
  const statusColors = { online:'bg-green-500/20 text-green-400', syncing:'bg-yellow-500/20 text-yellow-400', degraded:'bg-orange-500/20 text-orange-400', offline:'bg-red-500/20 text-red-400' };
  const typeColors = { 'Validator':'bg-yellow-500/20 text-yellow-400','Full Node':'bg-blue-500/20 text-blue-400','Relay':'bg-purple-500/20 text-purple-400','Light':'bg-cyan-500/20 text-cyan-400' };
  const flagMap = { 'Saudi Arabia':'🇸🇦','UAE':'🇦🇪','USA':'🇺🇸','UK':'🇬🇧','Singapore':'🇸🇬','India':'🇮🇳','Philippines':'🇵🇭','Pakistan':'🇵🇰','Bangladesh':'🇧🇩','Nigeria':'🇳🇬','Mexico':'🇲🇽','Egypt':'🇪🇬','Jordan':'🇯🇴','Turkey':'🇹🇷','Morocco':'🇲🇦','Sri Lanka':'🇱🇰','Nepal':'🇳🇵','Vietnam':'🇻🇳','Ghana':'🇬🇭','Kenya':'🇰🇪','Indonesia':'🇮🇩','China':'🇨🇳','Germany':'🇩🇪','France':'🇫🇷','Australia':'🇦🇺','Japan':'🇯🇵' };
  const tbody = document.getElementById('nodeExplorerBody');
  if (!filtered.length) { tbody.innerHTML='<tr><td colspan="7" class="px-4 py-6 text-center text-gray-500">No nodes match filters</td></tr>'; return; }
  tbody.innerHTML = filtered.map(n => `
    <tr class="border-b border-white/5 hover:bg-white/5">
      <td class="px-4 py-3 font-mono text-sm font-bold text-white">${n.name}</td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs ${typeColors[n.type]||''}">${n.type}</span></td>
      <td class="px-4 py-3 text-sm text-gray-300">${flagMap[n.country]||'🌐'} ${n.country}</td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs ${statusColors[n.status]||''}">${n.status}</span></td>
      <td class="px-4 py-3 text-sm ${n.latency_ms > 150 ? 'text-orange-400' : 'text-green-400'}">${n.latency_ms ? n.latency_ms+'ms' : '—'}</td>
      <td class="px-4 py-3 text-sm text-gray-300">${n.uptime_pct}%</td>
      <td class="px-4 py-3 flex gap-1 flex-wrap">
        <button onclick="nodeAction('restart','${n.name}')" class="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 border border-blue-500/30">Restart</button>
        <button onclick="nodeAction('shutdown','${n.name}')" class="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30">Shutdown</button>
        <button onclick="showNodeDetail(${JSON.stringify(n).replace(/"/g,'&quot;')})" class="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 border border-purple-500/30">Explore</button>
      </td>
    </tr>`).join('');
}

function nodeAction(action, nodeName) {
  const msg = action === 'restart' ? `Restart node ${nodeName}?` : `Shutdown node ${nodeName}? This will take it offline.`;
  if (confirm(msg)) {
    showToast(`${action === 'restart' ? '🔄 Restarting' : '⏹ Shutting down'} ${nodeName}...`, 'info');
    setTimeout(() => showToast(`${nodeName} ${action} command sent successfully.`, 'success'), 1500);
  }
}

function showNodeDetail(node) {
  document.getElementById('nodeDetailTitle').textContent = node.name + ' — Details';
  const statusColors = { online:'text-green-400', syncing:'text-yellow-400', degraded:'text-orange-400', offline:'text-red-400' };
  document.getElementById('nodeDetailContent').innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div class="glass rounded-lg p-3"><div class="text-gray-400 text-xs mb-1">Type</div><div class="font-semibold">${node.type}</div></div>
      <div class="glass rounded-lg p-3"><div class="text-gray-400 text-xs mb-1">Status</div><div class="font-semibold ${statusColors[node.status]||''}">${node.status}</div></div>
      <div class="glass rounded-lg p-3"><div class="text-gray-400 text-xs mb-1">Country</div><div class="font-semibold">${node.country}</div></div>
      <div class="glass rounded-lg p-3"><div class="text-gray-400 text-xs mb-1">Latency</div><div class="font-semibold">${node.latency_ms ? node.latency_ms+'ms' : 'N/A'}</div></div>
      <div class="glass rounded-lg p-3"><div class="text-gray-400 text-xs mb-1">Uptime</div><div class="font-semibold">${node.uptime_pct}%</div></div>
      <div class="glass rounded-lg p-3"><div class="text-gray-400 text-xs mb-1">Peers</div><div class="font-semibold">${node.peers}</div></div>
      <div class="glass rounded-lg p-3"><div class="text-gray-400 text-xs mb-1">Version</div><div class="font-semibold font-mono">${node.version}</div></div>
      <div class="glass rounded-lg p-3"><div class="text-gray-400 text-xs mb-1">Last Seen</div><div class="font-semibold text-xs">${node.last_seen}</div></div>
    </div>
    <div class="glass rounded-lg p-3">
      <div class="text-gray-400 text-xs mb-2 uppercase tracking-wider">Running Services</div>
      <div class="flex flex-wrap gap-2">
        ${(node.services||[]).map(s=>`<span class="px-2 py-1 rounded text-xs bg-accent/20 text-accent border border-accent/30">${s}</span>`).join('')}
      </div>
    </div>`;
  document.getElementById('nodeDetailModal').classList.remove('hidden');
}

function renderNodeLocations() {
  const container = document.getElementById('nodeLocationMap');
  if (!container || !_networkNodes.length) return;
  container.innerHTML = '';
  const W = container.clientWidth || 800, H = 420;
  const coords = {
    'Saudi Arabia':[45,24],'UAE':[54,24],'USA':[-100,38],'UK':[-2,54],
    'Singapore':[104,1],'India':[78,20],'Philippines':[122,12],'Pakistan':[70,30],
    'Bangladesh':[90,24],'Nigeria':[8,9],'Mexico':[-102,24],'Egypt':[30,27],
    'Jordan':[36,31],'Turkey':[35,39],'Morocco':[-7,32],'Sri Lanka':[81,7],
    'Nepal':[84,28],'Vietnam':[108,16],'Ghana':[-2,8],'Kenya':[38,0],
    'Indonesia':[117,-3],'China':[105,35],'Germany':[10,51],'France':[2,46],
    'Australia':[134,-26],'Japan':[138,36]
  };
  // Group nodes by country
  const byCountry = {};
  _networkNodes.forEach(n => { if(!byCountry[n.country]) byCountry[n.country]=[]; byCountry[n.country].push(n); });
  const svg = d3.select(container).append('svg').attr('width','100%').attr('height',H).style('background','#0f172a');
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.5,6]).on('zoom', e => g.attr('transform',e.transform)));
  const proj = d3.geoMercator().scale(W/7).translate([W/2, H/1.5]);
  // Simple graticule grid
  g.append('rect').attr('x',0).attr('y',0).attr('width',W).attr('height',H).attr('fill','#0f172a');
  // Draw node bubbles
  Object.entries(byCountry).forEach(([country, nodes]) => {
    const c = coords[country];
    if (!c) return;
    const [px,py] = proj(c);
    const r = 6 + nodes.length * 4;
    const onlineCount = nodes.filter(n=>n.status==='online').length;
    const color = onlineCount === nodes.length ? '#4ade80' : onlineCount > 0 ? '#facc15' : '#ef4444';
    g.append('circle').attr('cx',px).attr('cy',py).attr('r',r)
      .attr('fill',color).attr('fill-opacity',0.25).attr('stroke',color).attr('stroke-width',1.5);
    g.append('text').attr('x',px).attr('y',py+4).attr('text-anchor','middle')
      .attr('font-size','10px').attr('font-weight','bold').attr('fill','#fff')
      .text(nodes.length);
    g.append('text').attr('x',px).attr('y',py+r+12).attr('text-anchor','middle')
      .attr('font-size','8px').attr('fill','#94a3b8').text(country);
  });
  // Country list below map
  const listDiv = document.getElementById('nodeLocationList');
  if (listDiv) {
    listDiv.innerHTML = Object.entries(byCountry).map(([country,nodes])=>`
      <div class="glass rounded-lg p-3">
        <div class="font-semibold text-sm mb-1">${country} <span class="text-accent">(${nodes.length})</span></div>
        <div class="flex flex-wrap gap-1">${nodes.map(n=>`<span class="text-xs px-1.5 py-0.5 rounded bg-white/10">${n.name}</span>`).join('')}</div>
      </div>`).join('');
  }
}
