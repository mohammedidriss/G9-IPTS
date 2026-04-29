// tab-corridors.js — Corridors tab module for IPTS
let _corridors = [];
let _corridorFilter = 'all';
let _pendingToggleId = null;

const COUNTRY_CURRENCIES = {
  'Saudi Arabia':'SAR','UAE':'AED','USA':'USD','UK':'GBP','India':'INR',
  'Philippines':'PHP','Pakistan':'PKR','Bangladesh':'BDT','Nigeria':'NGN',
  'Mexico':'MXN','Lebanon':'LBP','Egypt':'EGP','Jordan':'JOD','Turkey':'TRY',
  'Morocco':'MAD','Sri Lanka':'LKR','Nepal':'NPR','Vietnam':'VND','Ghana':'GHS',
  'Kenya':'KES','Indonesia':'IDR','China':'CNY','Germany':'EUR','France':'EUR',
  'Australia':'AUD','Japan':'JPY','Singapore':'SGD'
};

const COUNTRY_COORDS = {
  'Saudi Arabia':[45,24],'UAE':[54,24],'USA':[-100,38],'UK':[-2,54],
  'Singapore':[104,1],'India':[78,20],'Philippines':[122,12],'Pakistan':[70,30],
  'Bangladesh':[90,24],'Nigeria':[8,9],'Mexico':[-102,24],'Egypt':[30,27],
  'Jordan':[36,31],'Turkey':[35,39],'Morocco':[-7,32],'Sri Lanka':[81,7],
  'Nepal':[84,28],'Vietnam':[108,16],'Ghana':[-2,8],'Kenya':[38,0],
  'Indonesia':[117,-3],'China':[105,35],'Germany':[10,51],'France':[2,46],
  'Australia':[134,-26],'Japan':[138,36],'Lebanon':[35.5,33.9]
};

async function loadCorridorsTab() {
  try {
    const token = localStorage.getItem('ipts_token');
    const res = await fetch('/api/corridors', { headers:{ Authorization:'Bearer '+token } });
    const _raw = await res.json();
    _corridors = Array.isArray(_raw) ? _raw : (_raw.corridors || []);
    renderCorridorList();
    populateNewCorridorDropdowns();
  } catch(e) { console.error('Corridors error', e); }
}

function switchCorridorView(view) {
  ['list','map'].forEach(v => {
    document.getElementById('corrPane-'+v)?.classList.toggle('hidden', v!==view);
    const btn = document.getElementById('corrBtn-'+v);
    if(btn){ btn.classList.toggle('bg-accent',v===view); btn.classList.toggle('text-white',v===view); btn.classList.toggle('glass',v!==view); btn.classList.toggle('text-gray-300',v!==view); }
  });
  if(view==='map') renderCorridorMap(_corridorFilter);
}

function filterCorridors(f) {
  _corridorFilter = f;
  ['all','active','inactive'].forEach(x => {
    const btn = document.getElementById('corrFilter-'+x);
    if(btn){ btn.classList.toggle('bg-accent',x===f); btn.classList.toggle('text-white',x===f); btn.classList.toggle('glass',x!==f); btn.classList.toggle('text-gray-300',x!==f); }
  });
  renderCorridorList();
}

function renderCorridorList() {
  const filtered = _corridors.filter(c => _corridorFilter==='all' || c.status===_corridorFilter);
  const counter = document.getElementById('corridorCount');
  if(counter) counter.textContent = filtered.length + ' corridors';
  const tbody = document.getElementById('corridorListBody');
  if(!tbody) return;
  if(!filtered.length){ tbody.innerHTML='<tr><td colspan="8" class="px-4 py-6 text-center text-gray-500">No corridors found</td></tr>'; return; }
  tbody.innerHTML = filtered.map(c => {
    const isActive = c.status==='active';
    const dt = c.date_added ? new Date(c.date_added).toLocaleString() : '—';
    return `<tr class="border-b border-white/5 hover:bg-white/5">
      <td class="px-4 py-3 font-semibold text-white">${c.source_country} - ${c.dest_country}</td>
      <td class="px-4 py-3 text-gray-300 text-xs">${c.source_currency}/${c.dest_currency}</td>
      <td class="px-4 py-3 text-gray-300">${parseFloat(c.exchange_rate).toFixed(4)}</td>
      <td class="px-4 py-3 text-gray-300">${parseFloat(c.fee_pct).toFixed(2)}%</td>
      <td class="px-4 py-3 text-gray-300 text-xs">${c.purpose||'—'}</td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs font-medium ${isActive?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}">${c.status}</span></td>
      <td class="px-4 py-3 text-gray-400 text-xs">${dt}</td>
      <td class="px-4 py-3 flex gap-1">
        <button onclick="openEditCorridor(${c.id})" class="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 border border-blue-500/30">Edit</button>
        <button onclick="openToggleCorridor(${c.id},'${c.status}')" class="px-2 py-1 rounded text-xs ${isActive?'bg-orange-500/20 text-orange-400 border-orange-500/30':'bg-green-500/20 text-green-400 border-green-500/30'} border hover:opacity-80">${isActive?'Deactivate':'Activate'}</button>
      </td>
    </tr>`;
  }).join('');
}

function openToggleCorridor(id, currentStatus) {
  _pendingToggleId = id;
  const isActive = currentStatus === 'active';
  document.getElementById('toggleModalTitle').textContent = isActive ? 'Deactivate Corridor' : 'Activate Corridor';
  document.getElementById('toggleModalDesc').textContent = `Enter security password to ${isActive?'deactivate':'activate'} this corridor`;
  document.getElementById('toggleModalPassword').value = '';
  document.getElementById('toggleModalError').classList.add('hidden');
  document.getElementById('corridorToggleModal').classList.remove('hidden');
}

async function confirmCorridorToggle() {
  const pw = document.getElementById('toggleModalPassword').value;
  if(!pw) return;
  const token = localStorage.getItem('ipts_token');
  const res = await fetch(`/api/corridors/${_pendingToggleId}/toggle`, {
    method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' },
    body: JSON.stringify({ password: pw })
  });
  const data = await res.json();
  if(!res.ok) {
    document.getElementById('toggleModalError').classList.remove('hidden');
    return;
  }
  document.getElementById('corridorToggleModal').classList.add('hidden');
  showToast(`Corridor ${data.new_status==='active'?'activated':'deactivated'} successfully`, 'success');
  loadCorridorsTab();
}

function openEditCorridor(id) {
  const c = _corridors.find(x=>x.id===id);
  if(!c) return;
  document.getElementById('editCorridorId').value = id;
  document.getElementById('editCorridorName').value = c.name||`${c.source_country}-${c.dest_country}`;
  document.getElementById('editCorridorRate').value = c.exchange_rate;
  document.getElementById('editCorridorFee').value = c.fee_pct;
  const purposeEl = document.getElementById('editCorridorPurpose');
  if(purposeEl) { for(let opt of purposeEl.options) if(opt.value===c.purpose) opt.selected=true; }
  document.getElementById('corridorEditModal').classList.remove('hidden');
}

async function saveCorridorEdit() {
  const id = document.getElementById('editCorridorId').value;
  const token = localStorage.getItem('ipts_token');
  const body = {
    name: document.getElementById('editCorridorName').value,
    exchange_rate: parseFloat(document.getElementById('editCorridorRate').value),
    fee_pct: parseFloat(document.getElementById('editCorridorFee').value),
    purpose: document.getElementById('editCorridorPurpose').value
  };
  const res = await fetch(`/api/corridors/${id}`, {
    method:'PUT', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if(res.ok) {
    document.getElementById('corridorEditModal').classList.add('hidden');
    showToast('Corridor updated successfully', 'success');
    loadCorridorsTab();
  } else showToast('Failed to update corridor', 'error');
}

function openAddCorridorModal() {
  document.getElementById('addCorridorModal').classList.remove('hidden');
  document.getElementById('addCorridorResult').classList.add('hidden');
}

function populateNewCorridorDropdowns() {
  const countries = Object.keys(COUNTRY_CURRENCIES).sort();
  ['newCorrSource','newCorrDest'].forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.innerHTML = countries.map(c=>`<option value="${c}">${c}</option>`).join('');
  });
  document.getElementById('newCorrSource').value = 'India';
  document.getElementById('newCorrDest').value = 'Saudi Arabia';
  onNewCorrCountryChange();
}

function onNewCorrCountryChange() {
  const src = document.getElementById('newCorrSource')?.value;
  const dst = document.getElementById('newCorrDest')?.value;
  if(src) document.getElementById('newCorrSrcCur').value = COUNTRY_CURRENCIES[src]||'';
  if(dst) document.getElementById('newCorrDstCur').value = COUNTRY_CURRENCIES[dst]||'';
}

async function fetchNewCorrRate() {
  const src = COUNTRY_CURRENCIES[document.getElementById('newCorrSource')?.value];
  const dst = COUNTRY_CURRENCIES[document.getElementById('newCorrDest')?.value];
  if(!src||!dst) return;
  const statusEl = document.getElementById('newCorrRateStatus');
  statusEl.textContent = 'Fetching live rate...';
  const token = localStorage.getItem('ipts_token');
  try {
    const res = await fetch(`/api/fx/rate?from=${src}&to=${dst}`, { headers:{ Authorization:'Bearer '+token } });
    const data = await res.json();
    if(data.rate) {
      document.getElementById('newCorrRate').value = data.rate;
      statusEl.textContent = `✓ Live rate: 1 ${src} = ${data.rate} ${dst}`;
      statusEl.className = 'text-xs text-green-400 mt-1';
    }
  } catch(e) { statusEl.textContent = 'Failed to fetch rate. Enter manually.'; statusEl.className='text-xs text-red-400 mt-1'; }
}

async function submitNewCorridor() {
  const src = document.getElementById('newCorrSource').value;
  const dst = document.getElementById('newCorrDest').value;
  const nodes = parseInt(document.getElementById('newCorrNodes').value)||8;
  const v = Math.ceil(nodes*0.2), fn = Math.ceil(nodes*0.35), rl = Math.ceil(nodes*0.25), lt = nodes-v-fn-rl;
  const body = {
    name: document.getElementById('newCorrName').value || `${src}-${dst}`,
    source_country: src, dest_country: dst,
    source_currency: COUNTRY_CURRENCIES[src], dest_currency: COUNTRY_CURRENCIES[dst],
    exchange_rate: parseFloat(document.getElementById('newCorrRate').value)||1,
    fee_pct: parseFloat(document.getElementById('newCorrFee').value)||0.5,
    min_amount: parseFloat(document.getElementById('newCorrMin').value)||100,
    max_amount: 100000, daily_limit: 1000000,
    purpose: document.getElementById('newCorrPurpose').value,
    node_validators: v, node_full: fn, node_relay: rl, node_light: Math.max(lt,1)
  };
  const token = localStorage.getItem('ipts_token');
  const res = await fetch('/api/corridors', { method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  const resultEl = document.getElementById('addCorridorResult');
  resultEl.classList.remove('hidden');
  if(res.ok) {
    resultEl.textContent = '✓ Corridor created successfully!';
    resultEl.className = 'mt-2 text-sm text-center text-green-400';
    setTimeout(()=>{ document.getElementById('addCorridorModal').classList.add('hidden'); loadCorridorsTab(); },1500);
  } else {
    resultEl.textContent = '✗ Failed to create corridor. Check inputs.';
    resultEl.className = 'mt-2 text-sm text-center text-red-400';
  }
}

function filterCorridorMap(f) {
  ['all','active','inactive'].forEach(x=>{
    const btn=document.getElementById('mapFilter-'+x);
    if(btn){ btn.classList.toggle('bg-accent',x===f); btn.classList.toggle('text-white',x===f); btn.classList.toggle('glass',x!==f); btn.classList.toggle('text-gray-300',x!==f); }
  });
  renderCorridorMap(f);
}

async function renderCorridorMap(filter='all') {
  const container = document.getElementById('corridorWorldMap');
  if (!container) return;
  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:520px;color:#64748b;font-size:13px;">Loading world map…</div>';

  const W = container.clientWidth || 960, H = 540;
  const filtered = _corridors.filter(c => filter === 'all' || c.status === filter);

  // Fetch world topojson
  let world;
  try {
    const resp = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    world = await resp.json();
  } catch(e) {
    container.innerHTML = '<div style="color:#f87171;padding:20px;">Failed to load world map data.</div>';
    return;
  }

  container.innerHTML = '';

  const svg = d3.select(container).append('svg')
    .attr('width', '100%').attr('height', H)
    .style('background', 'linear-gradient(135deg,#0a0f1e 0%,#0d1b2a 100%)')
    .style('border-radius', '12px');

  // Defs for glow filters and gradients
  const defs = svg.append('defs');

  // Active arc glow
  const glowActive = defs.append('filter').attr('id','glowActive').attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
  glowActive.append('feGaussianBlur').attr('stdDeviation','3').attr('result','blur');
  const feMergeA = glowActive.append('feMerge');
  feMergeA.append('feMergeNode').attr('in','blur');
  feMergeA.append('feMergeNode').attr('in','SourceGraphic');

  // Inactive arc glow
  const glowInactive = defs.append('filter').attr('id','glowInactive').attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
  glowInactive.append('feGaussianBlur').attr('stdDeviation','1.5').attr('result','blur');
  const feMergeI = glowInactive.append('feMerge');
  feMergeI.append('feMergeNode').attr('in','blur');
  feMergeI.append('feMergeNode').attr('in','SourceGraphic');

  // Node pulse gradient
  defs.append('radialGradient').attr('id','pulseGrad')
    .selectAll('stop').data([
      {offset:'0%',color:'#22d3ee',opacity:0.9},
      {offset:'100%',color:'#0891b2',opacity:0}
    ]).join('stop')
    .attr('offset',d=>d.offset).attr('stop-color',d=>d.color).attr('stop-opacity',d=>d.opacity);

  const g = svg.append('g');

  // Projection — Natural Earth style via Mercator
  const proj = d3.geoNaturalEarth1 ? d3.geoNaturalEarth1() : d3.geoMercator();
  proj.scale(W / 6.2).translate([W / 2, H / 2.1]).precision(0.1);
  const path = d3.geoPath().projection(proj);

  // Graticule grid
  const graticule = d3.geoGraticule()();
  g.append('path').datum(graticule)
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(148,163,184,0.06)')
    .attr('stroke-width', 0.5);

  // Ocean sphere
  g.append('path').datum({type:'Sphere'})
    .attr('d', path)
    .attr('fill', '#0c1a2e');

  // Countries
  const countries = topojson.feature(world, world.objects.countries);
  g.append('g').selectAll('path')
    .data(countries.features)
    .join('path')
    .attr('d', path)
    .attr('fill', '#1a2942')
    .attr('stroke', '#263f5e')
    .attr('stroke-width', 0.4);

  // Country borders
  g.append('path')
    .datum(topojson.mesh(world, world.objects.countries, (a,b) => a !== b))
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', '#2d4a6e')
    .attr('stroke-width', 0.3);

  // Collect unique country nodes
  const nodeMap = {};
  filtered.forEach(c => {
    if (COUNTRY_COORDS[c.source_country]) nodeMap[c.source_country] = COUNTRY_COORDS[c.source_country];
    if (COUNTRY_COORDS[c.dest_country])   nodeMap[c.dest_country]   = COUNTRY_COORDS[c.dest_country];
  });

  // Draw arcs
  const tooltip = document.getElementById('corridorMapTooltip');
  const arcGroup = g.append('g').attr('class','arcs');

  filtered.forEach(c => {
    const sc = COUNTRY_COORDS[c.source_country], dc = COUNTRY_COORDS[c.dest_country];
    if (!sc || !dc) return;

    const p1 = proj(sc), p2 = proj(dc);
    if (!p1 || !p2) return;

    const isActive = c.status === 'active';
    const color    = isActive ? '#22d3ee' : '#475569';
    const glow     = isActive ? 'url(#glowActive)' : 'url(#glowInactive)';

    // Control point for arc (curve upward)
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const dist = Math.sqrt(dx*dx + dy*dy);
    const curvature = Math.min(dist * 0.35, 120);
    const mx = (p1[0]+p2[0])/2 - dy * curvature / dist;
    const my = (p1[1]+p2[1])/2 + dx * curvature / dist;
    const d  = `M${p1[0]},${p1[1]} Q${mx},${my} ${p2[0]},${p2[1]}`;

    // Shadow arc (thicker, dimmer)
    arcGroup.append('path').attr('d',d).attr('fill','none')
      .attr('stroke', color).attr('stroke-width', isActive ? 3.5 : 2)
      .attr('stroke-opacity', 0.12).attr('pointer-events','none');

    // Main arc
    const arcPath = arcGroup.append('path').attr('d',d).attr('fill','none')
      .attr('stroke', color).attr('stroke-width', isActive ? 1.8 : 1)
      .attr('stroke-opacity', isActive ? 0.85 : 0.4)
      .attr('filter', glow)
      .attr('stroke-dasharray', isActive ? 'none' : '4 3')
      .style('cursor','pointer');

    // Hover interactions
    arcPath.on('mouseover', (e) => {
      arcPath.attr('stroke-width', isActive ? 3 : 2).attr('stroke-opacity', 1);
      if (tooltip) {
        tooltip.classList.remove('hidden');
        tooltip.innerHTML = `
          <div style="font-weight:700;margin-bottom:4px;font-size:13px;">${c.source_country} → ${c.dest_country}</div>
          <div style="color:#94a3b8;margin-bottom:3px;">${c.source_currency} / ${c.dest_currency}</div>
          <div>Rate: <strong>${parseFloat(c.exchange_rate).toFixed(4)}</strong></div>
          <div>Fee: <strong>${c.fee_pct}%</strong></div>
          <div>Purpose: <strong>${c.purpose||'—'}</strong></div>
          <div style="margin-top:5px;">
            <span style="padding:2px 8px;border-radius:4px;font-size:11px;background:${isActive?'rgba(34,211,238,0.2)':'rgba(100,116,139,0.2)'};color:${isActive?'#22d3ee':'#94a3b8'}">${c.status}</span>
          </div>`;
        tooltip.style.left=(e.clientX+14)+'px';
        tooltip.style.top=(e.clientY-10)+'px';
      }
    }).on('mousemove', e => {
      if(tooltip){ tooltip.style.left=(e.clientX+14)+'px'; tooltip.style.top=(e.clientY-10)+'px'; }
    }).on('mouseout', () => {
      arcPath.attr('stroke-width', isActive?1.8:1).attr('stroke-opacity', isActive?0.85:0.4);
      if(tooltip) tooltip.classList.add('hidden');
    });

    // Animated travel dot on active arcs
    if (isActive) {
      const dot = arcGroup.append('circle').attr('r', 3).attr('fill', '#22d3ee').attr('opacity', 0.9).attr('filter','url(#glowActive)').attr('pointer-events','none');
      const totalLen = (() => { try { return arcGroup.select('path').node()?.getTotalLength() || 300; } catch(e){ return 300; } })();
      function animateDot() {
        dot.attr('cx', p1[0]).attr('cy', p1[1]);
        dot.transition().duration(2000 + Math.random()*1500).ease(d3.easeLinear)
          .attrTween('cx', () => { const el = document.createElementNS('http://www.w3.org/2000/svg','path'); el.setAttribute('d',d); return t => el.getPointAtLength(t * el.getTotalLength()).x; })
          .attrTween('cy', () => { const el = document.createElementNS('http://www.w3.org/2000/svg','path'); el.setAttribute('d',d); return t => el.getPointAtLength(t * el.getTotalLength()).y; })
          .on('end', animateDot);
      }
      setTimeout(animateDot, Math.random()*2000);
    }
  });

  // Country node circles
  const nodeGroup = g.append('g').attr('class','nodes');
  Object.entries(nodeMap).forEach(([country, coords]) => {
    const p = proj(coords);
    if (!p) return;
    const corridorCount = filtered.filter(c => c.source_country===country || c.dest_country===country).length;
    const r = 4 + corridorCount * 1.5;

    // Pulse ring
    nodeGroup.append('circle').attr('cx',p[0]).attr('cy',p[1]).attr('r',r+4)
      .attr('fill','url(#pulseGrad)').attr('opacity',0.4).attr('pointer-events','none');

    // Main dot
    nodeGroup.append('circle').attr('cx',p[0]).attr('cy',p[1]).attr('r',r)
      .attr('fill','#0891b2').attr('stroke','#22d3ee').attr('stroke-width',1.5)
      .attr('filter','url(#glowActive)');

    // Label
    nodeGroup.append('text').attr('x',p[0]).attr('y',p[1]-r-5)
      .attr('text-anchor','middle').attr('font-size','9px').attr('font-weight','600')
      .attr('fill','#cbd5e1').attr('pointer-events','none')
      .text(country.length > 11 ? country.substring(0,10)+'.' : country);
  });

  // Zoom
  svg.call(d3.zoom().scaleExtent([0.6, 10]).on('zoom', e => g.attr('transform', e.transform)));

  // Legend
  const legendG = svg.append('g').attr('transform',`translate(16,${H-56})`);
  legendG.append('rect').attr('width',200).attr('height',48).attr('rx',8).attr('fill','rgba(10,15,30,0.85)').attr('stroke','rgba(255,255,255,0.1)').attr('stroke-width',0.5);
  [[12,'#22d3ee','Active Corridor'],[30,'#475569','Inactive Corridor']].forEach(([y,col,label])=>{
    legendG.append('line').attr('x1',10).attr('y1',y).attr('x2',30).attr('y2',y).attr('stroke',col).attr('stroke-width',2);
    legendG.append('text').attr('x',36).attr('y',y+4).attr('fill','#cbd5e1').attr('font-size','11px').text(label);
  });

  // Stats bar
  const active   = filtered.filter(c=>c.status==='active').length;
  const inactive = filtered.filter(c=>c.status==='inactive').length;
  const statsG   = svg.append('g').attr('transform',`translate(${W-170},${H-56})`);
  statsG.append('rect').attr('width',160).attr('height',48).attr('rx',8).attr('fill','rgba(10,15,30,0.85)').attr('stroke','rgba(255,255,255,0.1)').attr('stroke-width',0.5);
  statsG.append('text').attr('x',10).attr('y',18).attr('fill','#22d3ee').attr('font-size','11px').attr('font-weight','700').text(`${active} Active`);
  statsG.append('text').attr('x',10).attr('y',36).attr('fill','#64748b').attr('font-size','11px').text(`${inactive} Inactive`);
}
