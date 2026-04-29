// ============================================================
// tab-corridors.js — Corridors tab: Map, List, Add/Edit
// ============================================================

const COUNTRY_META = {
  'Lebanon': { currency: 'LBP', flag: '🇱🇧', coords: [33.85, 35.86] },
  'UAE': { currency: 'AED', flag: '🇦🇪', coords: [23.42, 53.85] },
  'Saudi Arabia': { currency: 'SAR', flag: '🇸🇦', coords: [23.89, 45.08] },
  'Kuwait': { currency: 'KWD', flag: '🇰🇼', coords: [29.31, 47.48] },
  'Qatar': { currency: 'QAR', flag: '🇶🇦', coords: [25.35, 51.18] },
  'Bahrain': { currency: 'BHD', flag: '🇧🇭', coords: [26.07, 50.55] },
  'Oman': { currency: 'OMR', flag: '🇴🇲', coords: [21.51, 55.92] },
  'Jordan': { currency: 'JOD', flag: '🇯🇴', coords: [30.59, 36.24] },
  'Egypt': { currency: 'EGP', flag: '🇪🇬', coords: [26.82, 30.80] },
  'USA': { currency: 'USD', flag: '🇺🇸', coords: [37.09, -95.71] },
  'UK': { currency: 'GBP', flag: '🇬🇧', coords: [55.38, -3.44] },
  'Germany': { currency: 'EUR', flag: '🇩🇪', coords: [51.16, 10.45] },
  'France': { currency: 'EUR', flag: '🇫🇷', coords: [46.23, 2.21] },
  'Australia': { currency: 'AUD', flag: '🇦🇺', coords: [-25.27, 133.77] },
  'Canada': { currency: 'CAD', flag: '🇨🇦', coords: [56.13, -106.35] },
  'India': { currency: 'INR', flag: '🇮🇳', coords: [20.59, 78.96] },
  'Pakistan': { currency: 'PKR', flag: '🇵🇰', coords: [30.37, 69.34] },
  'Philippines': { currency: 'PHP', flag: '🇵🇭', coords: [12.88, 121.77] },
  'Nigeria': { currency: 'NGN', flag: '🇳🇬', coords: [9.08, 8.68] },
  'Kenya': { currency: 'KES', flag: '🇰🇪', coords: [-0.02, 37.91] },
  'Ghana': { currency: 'GHS', flag: '🇬🇭', coords: [7.95, -1.02] },
  'Zimbabwe': { currency: 'ZWL', flag: '🇿🇼', coords: [-19.02, 29.15] },
  'South Africa': { currency: 'ZAR', flag: '🇿🇦', coords: [-30.56, 22.94] },
  'Tanzania': { currency: 'TZS', flag: '🇹🇿', coords: [-6.37, 34.89] },
  'Mexico': { currency: 'MXN', flag: '🇲🇽', coords: [23.63, -102.55] },
  'Brazil': { currency: 'BRL', flag: '🇧🇷', coords: [-14.24, -51.93] },
  'Colombia': { currency: 'COP', flag: '🇨🇴', coords: [4.57, -74.30] },
  'Singapore': { currency: 'SGD', flag: '🇸🇬', coords: [1.35, 103.82] },
  'Indonesia': { currency: 'IDR', flag: '🇮🇩', coords: [-0.79, 113.92] },
  'Japan': { currency: 'JPY', flag: '🇯🇵', coords: [36.20, 138.25] },
  'South Korea': { currency: 'KRW', flag: '🇰🇷', coords: [35.91, 127.77] },
  'China': { currency: 'CNY', flag: '🇨🇳', coords: [35.86, 104.19] },
  'Nepal': { currency: 'NPR', flag: '🇳🇵', coords: [28.39, 84.12] },
  'Bangladesh': { currency: 'BDT', flag: '🇧🇩', coords: [23.68, 90.35] },
  'Sri Lanka': { currency: 'LKR', flag: '🇱🇰', coords: [7.87, 80.77] }
};

let _corridorMapWorld = null;
let _corridors = [];
let _corridorFilter = { status: 'all', search: '' };

function corridorMapFilter() {
  refreshCorridorMap();
}

async function fetchCorridorGraphData() {
  try {
    const data = await apiFetch('/api/corridors?status=all');
    return Array.isArray(data) ? data : (data.corridors || []);
  } catch(e) { return []; }
}

function _purposeColor(purpose) {
  const map = { remittance: '#6366f1', trade: '#10b981', payroll: '#f59e0b', investment: '#ec4899', other: '#64748b' };
  return map[(purpose||'other').toLowerCase()] || '#64748b';
}

async function _drawGeoMap(corridors) {
  const container = document.getElementById('corridorTabMapContainer');
  if (!container) return;
  container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>Loading map…</div>';

  try {
    if (!_corridorMapWorld) {
      _corridorMapWorld = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    }
    const topo = topojson.feature(_corridorMapWorld, _corridorMapWorld.objects.countries);

    const W = container.clientWidth || 960, H = 520;
    container.innerHTML = '';

    // ── SVG + defs ──────────────────────────────────────────────────────────
    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H)
      .style('border-radius', '12px').style('display', 'block');

    const defs = svg.append('defs');

    // Deep-space background gradient
    const bgGrad = defs.append('radialGradient').attr('id','cmBg').attr('cx','50%').attr('cy','50%').attr('r','75%');
    bgGrad.append('stop').attr('offset','0%').attr('stop-color','#0d1b35');
    bgGrad.append('stop').attr('offset','100%').attr('stop-color','#060d1a');
    svg.append('rect').attr('width',W).attr('height',H).attr('fill','url(#cmBg)');

    // Subtle dot-grid overlay
    const dotPat = defs.append('pattern').attr('id','cmDots').attr('width',24).attr('height',24).attr('patternUnits','userSpaceOnUse');
    dotPat.append('circle').attr('cx',12).attr('cy',12).attr('r',0.7).attr('fill','#1e3a5f').attr('opacity',0.6);
    svg.append('rect').attr('width',W).attr('height',H).attr('fill','url(#cmDots)');

    // Glow filter for arcs
    const glowFilter = defs.append('filter').attr('id','cmGlow').attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
    glowFilter.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation','3').attr('result','blur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in','blur');
    feMerge.append('feMergeNode').attr('in','SourceGraphic');

    // Node glow filter
    const nodeGlow = defs.append('filter').attr('id','cmNodeGlow').attr('x','-80%').attr('y','-80%').attr('width','260%').attr('height','260%');
    nodeGlow.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation','5').attr('result','blur');
    const feMerge2 = nodeGlow.append('feMerge');
    feMerge2.append('feMergeNode').attr('in','blur');
    feMerge2.append('feMergeNode').attr('in','SourceGraphic');

    // Per-purpose gradient for arcs
    const PURPOSE_COLORS = {
      'labor remittance':   { a: '#f59e0b', b: '#fbbf24' },
      'family remittance':  { a: '#ec4899', b: '#f472b6' },
      'trade settlement':   { a: '#3b82f6', b: '#60a5fa' },
      'investment transfer':{ a: '#8b5cf6', b: '#a78bfa' },
      'payroll':            { a: '#10b981', b: '#34d399' },
      'education payments': { a: '#06b6d4', b: '#22d3ee' },
    };
    const purposeGradId = {};
    corridors.forEach(c => {
      const key = (c.purpose||'other').toLowerCase();
      if (purposeGradId[key]) return;
      const id = 'cmArcGrad_' + key.replace(/\s+/g,'_');
      purposeGradId[key] = id;
      const cols = PURPOSE_COLORS[key] || { a: '#64748b', b: '#94a3b8' };
      const lg = defs.append('linearGradient').attr('id', id).attr('gradientUnits','userSpaceOnUse');
      lg.append('stop').attr('offset','0%').attr('stop-color', cols.a);
      lg.append('stop').attr('offset','100%').attr('stop-color', cols.b);
    });

    const projection = d3.geoMercator().fitExtent([[20,20],[W-20,H-20]], topo);
    const path = d3.geoPath().projection(projection);
    const g = svg.append('g');

    const zoom = d3.zoom().scaleExtent([1, 10]).on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);

    // ── Countries ───────────────────────────────────────────────────────────
    g.append('g').selectAll('path').data(topo.features).join('path')
      .attr('d', path)
      .attr('fill', '#0e2040')
      .attr('stroke', '#1a3a6b')
      .attr('stroke-width', 0.4);

    // ── Graticule ────────────────────────────────────────────────────────────
    const graticule = d3.geoGraticule().step([30, 30])();
    g.append('path').datum(graticule).attr('d', path)
      .attr('fill', 'none').attr('stroke', '#112240').attr('stroke-width', 0.3).attr('opacity', 0.6);

    // ── Collect country coords ───────────────────────────────────────────────
    const countryCoords = {};
    corridors.forEach(c => {
      [c.source_country, c.dest_country].forEach(country => {
        if (country && COUNTRY_META[country] && !countryCoords[country]) {
          const [lat, lng] = COUNTRY_META[country].coords;
          const pt = projection([lng, lat]);
          if (pt) countryCoords[country] = pt;
        }
      });
    });

    // ── Tooltip ─────────────────────────────────────────────────────────────
    const tooltip = d3.select(container).append('div')
      .style('position','absolute')
      .style('background','rgba(6,15,35,0.95)')
      .style('border','1px solid rgba(99,179,237,0.35)')
      .style('box-shadow','0 0 18px rgba(59,130,246,0.25)')
      .style('padding','12px 16px').style('border-radius','10px')
      .style('font-size','11.5px').style('color','#cbd5e1')
      .style('pointer-events','none').style('opacity',0).style('z-index',100)
      .style('max-width','240px').style('line-height','1.7')
      .style('backdrop-filter','blur(4px)');

    // ── Arcs (shadow + main) ─────────────────────────────────────────────────
    corridors.forEach(c => {
      const src = countryCoords[c.source_country];
      const dst = countryCoords[c.dest_country];
      if (!src || !dst) return;
      const key = (c.purpose||'other').toLowerCase();
      const gradId = purposeGradId[key] || purposeGradId['other'];
      const cols = PURPOSE_COLORS[key] || { a: '#64748b', b: '#94a3b8' };
      const active = (c.status||'active').toLowerCase() === 'active';

      const dx = dst[0] - src[0], dy = dst[1] - src[1];
      const mx = (src[0]+dst[0])/2 - dy*0.22;
      const my = (src[1]+dst[1])/2 + dx*0.22 - Math.abs(dx)*0.12;
      const arcPath = `M${src[0]},${src[1]} Q${mx},${my} ${dst[0]},${dst[1]}`;

      // Gradient needs x1,y1,x2,y2 in userSpaceOnUse
      const gradEl = defs.select(`#${purposeGradId[key]}`);
      if (!gradEl.empty()) {
        gradEl.attr('x1', src[0]).attr('y1', src[1]).attr('x2', dst[0]).attr('y2', dst[1]);
      }

      if (active) {
        // Soft glow shadow arc
        g.append('path').attr('d', arcPath)
          .attr('fill','none')
          .attr('stroke', cols.a).attr('stroke-width', 4)
          .attr('stroke-opacity', 0.12)
          .attr('filter','url(#cmGlow)');
      }

      // Main arc
      const arcEl = g.append('path').attr('d', arcPath)
        .attr('fill','none')
        .attr('stroke', active ? `url(#${purposeGradId[key]})` : '#334155')
        .attr('stroke-width', active ? 1.8 : 1)
        .attr('stroke-opacity', active ? 0.85 : 0.25)
        .attr('stroke-dasharray', active ? null : '5,5')
        .attr('stroke-linecap', 'round')
        .attr('cursor', 'pointer')
        .on('mouseover', function(e) {
          d3.select(this).attr('stroke-width', active ? 3 : 1.5).attr('stroke-opacity', 1);
          tooltip.style('opacity',1).html(
            `<div style="font-weight:700;color:${cols.b};margin-bottom:5px;font-size:12.5px">${c.name||c.corridor_name||''}</div>` +
            `<div style="color:#94a3b8">🌍 ${c.source_country} <span style="color:${cols.a}">→</span> ${c.dest_country}</div>` +
            `<div style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.07);padding-top:4px">` +
            `<span style="color:#64748b">Currency</span> ${c.source_currency||''}→${c.dest_currency||c.destination_currency||''}<br>` +
            `<span style="color:#64748b">Rate</span> ${c.exchange_rate||'—'} &nbsp;·&nbsp; <span style="color:#64748b">Fee</span> ${c.fee_pct||'—'}%<br>` +
            `<span style="color:#64748b">Purpose</span> ${c.purpose||'—'}<br>` +
            `<span style="color:#64748b">Status</span> <span style="color:${active?'#4ade80':'#f87171'};font-weight:600">${c.status||'active'}</span>` +
            `</div>`
          );
        })
        .on('mousemove', e => tooltip.style('left',(e.offsetX+16)+'px').style('top',(e.offsetY-10)+'px'))
        .on('mouseout', function() {
          d3.select(this).attr('stroke-width', active ? 1.8 : 1).attr('stroke-opacity', active ? 0.85 : 0.25);
          tooltip.style('opacity',0);
        });

      // Animated travel dot on active arcs
      if (active) {
        const dot = g.append('circle').attr('r', 2.5)
          .attr('fill', cols.b).attr('opacity', 0.9).attr('pointer-events','none');
        const totalLen = (() => {
          try { const tmp = document.createElementNS('http://www.w3.org/2000/svg','path'); tmp.setAttribute('d',arcPath); return tmp.getTotalLength(); } catch(e) { return 200; }
        })();
        const animateDot = () => {
          dot.attr('cx', src[0]).attr('cy', src[1]).attr('opacity', 0.9);
          dot.transition().duration(2200 + Math.random()*1000).ease(d3.easeSinInOut)
            .attrTween('cx', () => t => {
              const q = 1-t, xx = q*q*src[0] + 2*q*t*mx + t*t*dst[0]; return xx;
            })
            .attrTween('cy', () => t => {
              const q = 1-t, yy = q*q*src[1] + 2*q*t*my + t*t*dst[1]; return yy;
            })
            .on('end', animateDot);
        };
        setTimeout(animateDot, Math.random()*2000);
      }
    });

    // ── Country nodes ────────────────────────────────────────────────────────
    Object.entries(countryCoords).forEach(([country, [cx, cy]]) => {
      const meta = COUNTRY_META[country] || {};
      const corridorCount = corridors.filter(c => c.source_country === country || c.dest_country === country).length;
      const isHub = corridorCount >= 3;
      const r = isHub ? 8 : 5;

      const nodeG = g.append('g').attr('cursor','pointer');

      // Outer pulse ring
      nodeG.append('circle').attr('cx',cx).attr('cy',cy).attr('r', r+4)
        .attr('fill','none')
        .attr('stroke', isHub ? '#60a5fa' : '#3b82f6')
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);

      // Main node
      nodeG.append('circle').attr('cx',cx).attr('cy',cy).attr('r', r)
        .attr('fill', isHub ? '#1d4ed8' : '#1e3a5f')
        .attr('stroke', isHub ? '#93c5fd' : '#3b82f6')
        .attr('stroke-width', isHub ? 2 : 1.5)
        .attr('filter','url(#cmNodeGlow)');

      // Inner bright dot
      nodeG.append('circle').attr('cx',cx).attr('cy',cy).attr('r', 2)
        .attr('fill', isHub ? '#bfdbfe' : '#60a5fa').attr('opacity', 0.9);

      // Flag emoji
      nodeG.append('text').attr('x',cx).attr('y',cy - r - 5)
        .attr('text-anchor','middle').attr('font-size', isHub ? '13px' : '11px')
        .style('user-select','none').text(meta.flag||'');

      nodeG.on('mouseover', e => {
        tooltip.style('opacity',1).html(
          `<div style="font-weight:700;color:#93c5fd;margin-bottom:3px">${meta.flag||''} ${country}</div>` +
          `<div style="color:#64748b">Corridors: <span style="color:#e2e8f0">${corridorCount}</span></div>` +
          (isHub ? `<div style="color:#fbbf24;font-size:10px">★ Hub node</div>` : '')
        );
      })
      .on('mousemove', e => tooltip.style('left',(e.offsetX+14)+'px').style('top',(e.offsetY-20)+'px'))
      .on('mouseout', () => tooltip.style('opacity',0));
    });

    // ── Zoom controls ────────────────────────────────────────────────────────
    const zoomCtrl = svg.append('g').attr('transform', `translate(${W-54}, 14)`);
    [['+', 0, 1.5], ['−', 42, 0.67]].forEach(([lbl, dy, factor]) => {
      const btn = zoomCtrl.append('g').attr('transform', `translate(0,${dy})`).attr('cursor','pointer');
      btn.append('rect').attr('width',36).attr('height',36).attr('rx',7)
        .attr('fill','rgba(15,23,42,0.8)').attr('stroke','#1e3a6b').attr('stroke-width',1);
      btn.append('text').attr('x',18).attr('y',25).attr('text-anchor','middle')
        .attr('fill','#7dd3fc').attr('font-size','20px').attr('pointer-events','none').text(lbl);
      btn.on('click', () => svg.transition().duration(350).call(zoom.scaleBy, factor));
    });

    // ── KPI update ────────────────────────────────────────────────────────────
    const activeCnt = corridors.filter(c => (c.status||'active').toLowerCase() === 'active').length;
    const countries = new Set();
    corridors.forEach(c => { if(c.source_country) countries.add(c.source_country); if(c.dest_country) countries.add(c.dest_country); });
    [['cmKpiTotal', corridors.length], ['cmKpiActive', activeCnt], ['cmKpiCountries', countries.size]].forEach(([id, val]) => {
      const el = document.getElementById(id); if(el) el.textContent = val;
    });

  } catch(e) {
    container.innerHTML = `<div class="flex items-center justify-center h-full text-red-400 text-sm">Map error: ${e.message}</div>`;
  }
}

async function refreshCorridorMap() {
  const statusFilter = (document.getElementById('corrFilterStatus')||{value:'all'}).value;
  const searchFilter = ((document.getElementById('corrFilterSearch')||{value:''}).value||'').toLowerCase();
  
  let corridors = await fetchCorridorGraphData();
  if (statusFilter !== 'all') corridors = corridors.filter(c => (c.status||'active').toLowerCase() === statusFilter);
  if (searchFilter) corridors = corridors.filter(c =>
    (c.name||c.corridor_name||'').toLowerCase().includes(searchFilter) ||
    (c.source_country||'').toLowerCase().includes(searchFilter) ||
    (c.dest_country||'').toLowerCase().includes(searchFilter)
  );
  
  _corridors = corridors;
  await _drawGeoMap(corridors);
}

function toggleCorridorView(view) {
  const mapView = document.getElementById('corridorMapView');
  const listView = document.getElementById('corridorTableView');
  const mapBtn = document.getElementById('corrViewMap');
  const listBtn = document.getElementById('corrViewList');
  if (view === 'map') {
    mapView.classList.remove('hidden'); listView.classList.add('hidden');
    mapBtn.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-white transition';
    listBtn.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition';
    refreshCorridorMap();
  } else {
    mapView.classList.add('hidden'); listView.classList.remove('hidden');
    mapBtn.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition';
    listBtn.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-white transition';
    loadCorridors();
  }
}

async function loadCorridors() {
  try {
    const data = await apiFetch('/api/corridors?status=all');
    const corridors = Array.isArray(data) ? data : (data.corridors || []);
    _corridors = corridors;
    filterCorridors();
  } catch(e) { console.error('loadCorridors error', e); }
}

let _corridorStatusFilter = 'all';

function filterCorridors(statusArg) {
  // Accept status from button clicks OR keep current filter
  if (statusArg !== undefined) {
    _corridorStatusFilter = statusArg;
    // Update button styles
    ['cfAll','cfActive','cfInactive'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 hover:text-gray-800';
    });
    const activeBtn = document.getElementById(
      statusArg === 'all' ? 'cfAll' : statusArg === 'active' ? 'cfActive' : 'cfInactive'
    );
    if (activeBtn) activeBtn.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-accent text-white';
  }
  const q = ((document.getElementById('corrTableSearch')||{value:''}).value||'').toLowerCase();
  const s = _corridorStatusFilter;
  const filtered = _corridors.filter(c =>
    (s === 'all' || (c.status||'active').toLowerCase() === s) &&
    (!q || (c.name||c.corridor_name||'').toLowerCase().includes(q) ||
     (c.source_country||'').toLowerCase().includes(q) ||
     (c.dest_country||'').toLowerCase().includes(q))
  );
  const tbody = document.getElementById('corridorTableBody');
  if (!tbody) return;
  tbody.innerHTML = filtered.map(c => {
    const active = (c.status||'active').toLowerCase() === 'active';
    return `<tr class="hover:bg-white/5 border-b border-white/5">
      <td class="px-4 py-3 text-sm font-semibold text-gray-800">${c.name||c.corridor_name||'—'}</td>
      <td class="px-4 py-3 text-xs text-gray-300">${c.source_country||'—'}</td>
      <td class="px-4 py-3 text-xs text-gray-300">${c.dest_country||'—'}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${c.source_currency||''}→${c.dest_currency||c.destination_currency||''}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${c.exchange_rate||'—'}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${c.fee_pct||'—'}%</td>
      <td class="px-4 py-3 text-xs text-gray-400">${c.purpose||'—'}</td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-semibold ${active?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}">${c.status||'active'}</span></td>
      <td class="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">${c.created_at ? new Date(c.created_at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
      <td class="px-4 py-3 flex gap-2">
        ${ROLE === 'admin' ? `<button onclick="editCorridor(${c.id})" class="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40"><i class="fas fa-edit"></i></button>` : ''}
        ${ROLE === 'admin' ? `<button onclick="toggleCorridor(${c.id},'${active?'inactive':'active'}')" class="px-2 py-1 text-xs ${active?'bg-yellow-600/20 text-yellow-400':'bg-green-600/20 text-green-400'} rounded hover:opacity-80">${active?'Disable':'Enable'}</button>` : '<span class="text-[10px] text-gray-400 italic">View only</span>'}
      </td>
    </tr>`;
  }).join('');
}

// Helper: read a corridor form field by its actual HTML id
function _corrField(id) { return document.getElementById(id); }

function showAddCorridorModal(editId) {
  const modal = document.getElementById('corridorModal');
  if (!modal) return;
  const titleEl = document.getElementById('corridorModalTitle');
  if (titleEl) titleEl.innerHTML = `<i class="fas fa-route mr-2 text-accent"></i>${editId ? 'Edit Corridor' : 'Add New Corridor'}`;
  const form = document.getElementById('corridorForm');
  if (form) form.reset();
  const hiddenId = document.getElementById('corridorEditId');
  if (hiddenId) hiddenId.value = editId || '';
  // Reset node totals display
  updateNodeTotal();
  modal.classList.remove('hidden');
}

function closeCorridorModal() {
  const modal = document.getElementById('corridorModal');
  if (modal) modal.classList.add('hidden');
}

async function editCorridor(id) {
  try {
    const c = await apiFetch(`/api/corridors/${id}`);
    showAddCorridorModal(id);
    // Map DB fields → HTML element IDs
    const fieldMap = {
      name:           'corridorName',
      exchange_rate:  'corridorExchangeRate',
      fee_pct:        'corridorFee',
      purpose:        'corridorPurpose',
      min_amount:     'corridorMinAmount',
      max_amount:     'corridorMaxAmount',
      daily_limit:    'corridorDailyLimit',
      node_validators:'corridorNodeValidators',
      node_full:      'corridorNodeFull',
      node_relay:     'corridorNodeRelay',
      node_light:     'corridorNodeLight',
    };
    Object.entries(fieldMap).forEach(([dbField, elId]) => {
      const el = document.getElementById(elId);
      if (el && c[dbField] !== undefined) el.value = c[dbField];
    });
    // Source/dest country selects — find matching option by country name
    const srcSel = document.getElementById('corridorSourceCountry');
    const dstSel = document.getElementById('corridorDestCountry');
    if (srcSel && c.source_country) {
      [...srcSel.options].forEach(o => { if (o.value.startsWith(c.source_country + '|') || o.value === c.source_country) srcSel.value = o.value; });
    }
    if (dstSel && c.dest_country) {
      [...dstSel.options].forEach(o => { if (o.value.startsWith(c.dest_country + '|') || o.value === c.dest_country) dstSel.value = o.value; });
    }
    updateNodeTotal();
  } catch(e) { showToast('Failed to load corridor', 'error'); }
}

// Approval modal state
let _pendingToggleId = null;
let _pendingToggleStatus = null;
const CORRIDOR_APPROVAL_PASSWORD = '123456';

function toggleCorridor(id, newStatus) {
  if (ROLE !== 'admin') { showToast('Only Admin can enable or disable corridors', 'error'); return; }
  _pendingToggleId = id;
  _pendingToggleStatus = newStatus;
  const isDisabling = newStatus === 'inactive';
  const modal = document.getElementById('corridorApprovalModal');
  const icon  = document.getElementById('corridorApprovalIcon');
  const title = document.getElementById('corridorApprovalTitle');
  const sub   = document.getElementById('corridorApprovalSubtitle');
  const btn   = document.getElementById('corridorApprovalConfirmBtn');
  const err   = document.getElementById('corridorApprovalError');
  const inp   = document.getElementById('corridorApprovalPassword');
  if (isDisabling) {
    icon.style.background = '#fef3c7';
    icon.innerHTML = '<i class="fas fa-ban text-yellow-500"></i>';
    title.textContent = 'Disable Corridor';
    sub.textContent = 'Enter approval password to disable this corridor';
    btn.style.background = '#d97706';
  } else {
    icon.style.background = '#dcfce7';
    icon.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>';
    title.textContent = 'Enable Corridor';
    sub.textContent = 'Enter approval password to enable this corridor';
    btn.style.background = '#16a34a';
  }
  inp.value = '';
  err.classList.add('hidden');
  modal.classList.remove('hidden');
  setTimeout(() => inp.focus(), 100);
}

function closeCorridorApprovalModal() {
  document.getElementById('corridorApprovalModal').classList.add('hidden');
  _pendingToggleId = null;
  _pendingToggleStatus = null;
}

async function confirmCorridorApproval() {
  const inp = document.getElementById('corridorApprovalPassword');
  const err = document.getElementById('corridorApprovalError');
  if (inp.value !== CORRIDOR_APPROVAL_PASSWORD) {
    err.classList.remove('hidden');
    inp.value = '';
    inp.focus();
    return;
  }
  // Capture before closing (close resets the pending vars)
  const id = _pendingToggleId;
  const newStatus = _pendingToggleStatus;
  closeCorridorApprovalModal();
  try {
    await apiFetch(`/api/corridors/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    showToast(`Corridor ${newStatus === 'active' ? 'enabled' : 'disabled'}`, 'success');
    loadCorridors();
  } catch(e) { showToast('Failed to update corridor', 'error'); }
}

async function submitCorridorForm(e) {
  if (e) e.preventDefault();
  const editId = (document.getElementById('corridorEditId') || {}).value;

  // Parse country selects: value format is "CountryName|flag|CURRENCY"
  function parseCountrySelect(elId) {
    const el = document.getElementById(elId);
    if (!el || !el.value) return { country: '', flag: '', currency: '' };
    const parts = el.value.split('|');
    return { country: parts[0] || '', flag: parts[1] || '', currency: parts[2] || '' };
  }

  const src = parseCountrySelect('corridorSourceCountry');
  const dst = parseCountrySelect('corridorDestCountry');

  const payload = {
    name:           (document.getElementById('corridorName')         || {}).value || `${src.country} - ${dst.country}`,
    source_country: src.country,
    source_flag:    src.flag,
    source_currency:src.currency,
    dest_country:   dst.country,
    dest_flag:      dst.flag,
    dest_currency:  dst.currency,
    exchange_rate:  parseFloat((document.getElementById('corridorExchangeRate') || {}).value) || 1,
    fee_pct:        parseFloat((document.getElementById('corridorFee')          || {}).value) || 0.5,
    purpose:        (document.getElementById('corridorPurpose')      || {}).value || 'General Transfer',
    min_amount:     parseFloat((document.getElementById('corridorMinAmount')    || {}).value) || 100,
    max_amount:     parseFloat((document.getElementById('corridorMaxAmount')    || {}).value) || 50000,
    daily_limit:    parseFloat((document.getElementById('corridorDailyLimit')   || {}).value) || 200000,
    node_validators:parseInt((document.getElementById('corridorNodeValidators') || {}).value) || 3,
    node_full:      parseInt((document.getElementById('corridorNodeFull')       || {}).value) || 4,
    node_relay:     parseInt((document.getElementById('corridorNodeRelay')      || {}).value) || 2,
    node_light:     parseInt((document.getElementById('corridorNodeLight')      || {}).value) || 2,
    status: 'active'
  };

  if (!payload.source_country || !payload.dest_country) {
    showToast('Please select both source and destination countries', 'warning');
    return;
  }

  try {
    if (editId) {
      await apiFetch(`/api/corridors/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Corridor updated', 'success');
    } else {
      await apiFetch('/api/corridors', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Corridor added successfully', 'success');
    }
    closeCorridorModal();
    loadCorridors();
    refreshCorridorMap();
  } catch(e) { showToast('Failed to save corridor: ' + e.message, 'error'); }
}

function onCorridorCountryChange() {
  // Auto-fill corridor name when both countries selected
  const srcSel = document.getElementById('corridorSourceCountry');
  const dstSel = document.getElementById('corridorDestCountry');
  const nameEl = document.getElementById('corridorName');
  if (!srcSel || !dstSel || !nameEl) return;

  const srcParts = (srcSel.value || '').split('|');
  const dstParts = (dstSel.value || '').split('|');
  const srcName = srcParts[0] || '';
  const dstName = dstParts[0] || '';
  const srcCur  = srcParts[2] || '';
  const dstCur  = dstParts[2] || '';

  // Only auto-fill name if user hasn't manually typed one
  if (srcName && dstName && (!nameEl.value || nameEl.dataset.autoFilled !== '0')) {
    nameEl.value = `${srcName} - ${dstName}`;
  }

  // Enable/disable live rate button
  const rateBtn = document.getElementById('fetchRateBtn');
  if (rateBtn) rateBtn.disabled = !(srcCur && dstCur);

  // Show rate pair label
  const pairLabel = document.getElementById('corridorRatePair');
  if (pairLabel && srcCur && dstCur) pairLabel.textContent = `(${srcCur} → ${dstCur})`;
}

async function fetchLiveRate() {
  const srcSel = document.getElementById('corridorSourceCountry');
  const dstSel = document.getElementById('corridorDestCountry');
  const srcCur = (srcSel?.value || '').split('|')[2];
  const dstCur = (dstSel?.value || '').split('|')[2];
  if (!srcCur || !dstCur) { showToast('Select both countries first', 'warning'); return; }
  const rateBtn = document.getElementById('fetchRateBtn');
  if (rateBtn) rateBtn.textContent = '⏳';
  try {
    const data = await apiFetch(`/api/fx/live-rate?from=${srcCur}&to=${dstCur}`);
    const rateEl = document.getElementById('corridorExchangeRate');
    if (rateEl && data.rate) {
      rateEl.value = parseFloat(data.rate).toFixed(4);
      const src = document.getElementById('corridorRateSource');
      if (src) { src.textContent = `Live rate: 1 ${srcCur} = ${data.rate} ${dstCur}`; src.classList.remove('hidden'); }
      showToast(`1 ${srcCur} = ${data.rate} ${dstCur}`, 'success');
    }
  } catch(e) { showToast('Could not fetch live rate', 'warning'); }
  finally { if (rateBtn) rateBtn.textContent = '⚡ Live'; }
}

function updateNodeTotal() {
  const v = parseInt((document.getElementById('corridorNodeValidators') || {}).value) || 0;
  const f = parseInt((document.getElementById('corridorNodeFull')       || {}).value) || 0;
  const r = parseInt((document.getElementById('corridorNodeRelay')      || {}).value) || 0;
  const l = parseInt((document.getElementById('corridorNodeLight')      || {}).value) || 0;
  const total = v + f + r + l;
  const totalEl = document.getElementById('corridorNodeTotal');
  const costEl  = document.getElementById('corridorNodeCost');
  if (totalEl) totalEl.textContent = total;
  if (costEl)  costEl.textContent = (total * 200).toLocaleString();
}
