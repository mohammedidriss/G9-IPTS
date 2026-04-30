// tab-beneficiaries.js — Beneficiary module for IPTS

let ALL_BENEFICIARIES = [];

async function loadBeneficiaries() {
  try {
    const data = await apiFetch('/api/beneficiaries');
    ALL_BENEFICIARIES = data.beneficiaries || [];
    renderBeneficiaries(ALL_BENEFICIARIES);
    populatePaymentBeneficiaryDropdown(ALL_BENEFICIARIES);
  } catch (e) { console.error('Load beneficiaries error:', e); }
}

function populatePaymentBeneficiaryDropdown(list) {
  const sel = document.getElementById('payBeneficiary');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Select beneficiary...</option>';

  // Group: legitimate first, then suspicious
  const legit = list.filter(b => !b.suspicious);
  const suspicious = list.filter(b => b.suspicious);

  if (legit.length) {
    const grp = document.createElement('optgroup');
    grp.label = '✓ Verified Beneficiaries';
    legit.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.dataset.suspicious = 'false';
      opt.dataset.currency = b.currency || 'USD';
      opt.textContent = b.name + (b.bank_name ? ` — ${b.bank_name}` : '') + (b.country ? ` (${b.country})` : '');
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  }

  if (suspicious.length) {
    const grp = document.createElement('optgroup');
    grp.label = '⚠ High-Risk / Watchlist';
    suspicious.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.dataset.suspicious = 'true';
      opt.dataset.currency = b.currency || 'USD';
      opt.textContent = '⚠ ' + b.name + (b.country ? ` (${b.country})` : '');
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  }

  if (current) sel.value = current;
  // Re-trigger warning state
  if (sel.value) onBeneficiarySelect(sel);
}

function onBeneficiarySelect(sel) {
  const warning = document.getElementById('suspiciousBeneficiaryWarning');
  if (!warning) return;
  const selected = sel.options[sel.selectedIndex];
  const isSuspicious = selected && selected.dataset.suspicious === 'true';
  if (isSuspicious) {
    warning.classList.remove('hidden');
    sel.classList.add('border-red-400', 'bg-red-50');
    sel.classList.remove('border-gray-200');
  } else {
    warning.classList.add('hidden');
    sel.classList.remove('border-red-400', 'bg-red-50');
  }
}

function filterBeneficiaries() {
  const q = (document.getElementById('benSearch').value || '').toLowerCase();
  const filtered = ALL_BENEFICIARIES.filter(b =>
    b.name.toLowerCase().includes(q) ||
    (b.nickname || '').toLowerCase().includes(q) ||
    (b.bank_name || '').toLowerCase().includes(q) ||
    (b.country || '').toLowerCase().includes(q)
  );
  renderBeneficiaries(filtered);
}

function renderBeneficiaries(list) {
  document.getElementById('benCount').textContent = `${list.length} beneficiar${list.length === 1 ? 'y' : 'ies'}`;
  const tbody = document.getElementById('beneficiariesBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-600">No beneficiaries found.</td></tr>';
    return;
  }
  const countryFlags = {US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',FR:'🇫🇷',JP:'🇯🇵',CH:'🇨🇭',AU:'🇦🇺',CA:'🇨🇦',SG:'🇸🇬',AE:'🇦🇪',SA:'🇸🇦',IN:'🇮🇳',CN:'🇨🇳',BR:'🇧🇷',HK:'🇭🇰',KR:'🇰🇷',MX:'🇲🇽',NG:'🇳🇬',ZA:'🇿🇦',KY:'🇰🇾',VG:'🇻🇬',PA:'🇵🇦',SC:'🇸🇨',IR:'🇮🇷'};
  tbody.innerHTML = list.map(b => {
    const flag = countryFlags[b.country] || '🌍';
    const typeIcon = b.beneficiary_type === 'corporate' ? 'fa-building' : b.beneficiary_type === 'trust' ? 'fa-landmark' : 'fa-user';
    const typeBadge = b.beneficiary_type === 'corporate' ? 'bg-blue-500/20 text-blue-400' : b.beneficiary_type === 'trust' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400';
    const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString() : '—';
    const rowClass = b.suspicious ? 'border-b border-red-100 bg-red-50/40 hover:bg-red-50 transition' : 'border-b border-gray-100 hover:bg-gray-50 transition';
    const suspiciousBadge = b.suspicious
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 ml-1"><i class="fas fa-skull-crossbones mr-1"></i>WATCHLIST</span>`
      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ml-1"><i class="fas fa-check mr-1"></i>Verified</span>`;
    const avatarBg = b.suspicious ? 'bg-red-200' : 'bg-gray-200';
    return `<tr class="${rowClass}">
      <td class="py-3 pr-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-accent text-sm font-bold">${b.suspicious ? '⚠' : b.name.charAt(0).toUpperCase()}</div>
          <div>
            <p class="text-gray-800 font-medium">${b.name} ${suspiciousBadge}</p>
            ${b.nickname ? `<p class="text-gray-500 text-xs">${b.nickname}</p>` : ''}
            ${b.account_number ? `<p class="text-gray-600 text-xs font-mono">${b.account_number.slice(0,4)}****${b.account_number.slice(-4)}</p>` : ''}
          </div>
        </div>
      </td>
      <td class="py-3 pr-3"><span class="badge ${typeBadge}"><i class="fas ${typeIcon} mr-1"></i>${b.beneficiary_type}</span></td>
      <td class="py-3 pr-3 text-gray-400">
        ${b.swift_code
          ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${b.suspicious ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} text-xs font-medium mb-1"><i class="fas fa-${b.suspicious ? 'ban' : 'exclamation-circle'} text-xs"></i>${b.suspicious ? 'High-Risk' : 'SWIFT'}</span><br><span class="font-mono text-xs">${b.swift_code}</span>`
          : `<span class="text-xs text-gray-400">—</span>`
        }
        ${b.bank_name ? `<br><span class="text-xs text-gray-400">${b.bank_name}</span>` : ''}
      </td>
      <td class="py-3 pr-3">${flag} ${b.country}</td>
      <td class="py-3 pr-3"><span class="font-mono text-accent">${b.currency}</span></td>
      <td class="py-3 pr-3 text-gray-500">${dateStr}</td>
      <td class="py-3 text-right">
        ${b.suspicious
          ? `<button onclick="sendToSuspiciousBeneficiary('${b.name.replace(/'/g, "\\'")}')" class="px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 transition mr-1" title="Send (will be blocked)"><i class="fas fa-paper-plane text-xs"></i></button>`
          : `<button onclick="selectBeneficiary('${b.name.replace(/'/g, "\\'")}')" class="px-2 py-1 rounded text-xs text-green-600 hover:bg-green-50 transition mr-1" title="Send payment"><i class="fas fa-paper-plane text-xs"></i></button>`
        }
        <button onclick="editBeneficiary('${b.id}')" class="px-2 py-1 rounded text-blue-400 hover:bg-blue-500/10 transition" title="Edit"><i class="fas fa-pen text-xs"></i></button>
        <button onclick="deleteBeneficiary('${b.id}', '${b.name.replace(/'/g, "\\'")}')" class="px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition" title="Delete"><i class="fas fa-trash text-xs"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function addBeneficiary() {
  const errDiv = document.getElementById('benFormError');
  const sucDiv = document.getElementById('benFormSuccess');
  errDiv.classList.add('hidden');
  sucDiv.classList.add('hidden');

  const name = document.getElementById('benName').value.trim();
  if (!name) {
    errDiv.textContent = 'Beneficiary name is required.';
    errDiv.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('benAddBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding...';

  try {
    const result = await apiFetch('/api/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        nickname: document.getElementById('benNickname').value.trim(),
        account_number: document.getElementById('benAccount').value.trim(),
        bank_name: document.getElementById('benBank').value.trim(),
        swift_code: document.getElementById('benSwift').value.trim().toUpperCase() || null,
        wallet_address: document.getElementById('benWallet').value.trim() || null,
        country: document.getElementById('benCountry').value,
        currency: document.getElementById('benCurrency').value,
        beneficiary_type: document.getElementById('benType').value,
        notes: document.getElementById('benNotes').value.trim(),
      })
    });
    sucDiv.textContent = result.message || 'Beneficiary added successfully!';
    sucDiv.classList.remove('hidden');
    ['benName','benNickname','benAccount','benBank','benSwift','benWallet','benNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('benType').value = 'individual';
    document.getElementById('benCountry').value = 'US';
    document.getElementById('benCurrency').value = 'USD';
    loadBeneficiaries();
    setTimeout(() => sucDiv.classList.add('hidden'), 4000);
  } catch (e) {
    errDiv.textContent = e.message || 'Failed to add beneficiary.';
    errDiv.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus mr-2"></i>Add Beneficiary';
  }
}

function editBeneficiary(id) {
  const b = ALL_BENEFICIARIES.find(x => x.id === id);
  if (!b) return;
  document.getElementById('benName').value = b.name || '';
  document.getElementById('benNickname').value = b.nickname || '';
  document.getElementById('benAccount').value = b.account_number || '';
  document.getElementById('benBank').value = b.bank_name || '';
  document.getElementById('benSwift').value = b.swift_code || '';
  document.getElementById('benWallet').value = b.wallet_address || '';
  document.getElementById('benCountry').value = b.country || 'US';
  document.getElementById('benCurrency').value = b.currency || 'USD';
  document.getElementById('benType').value = b.beneficiary_type || 'individual';
  document.getElementById('benNotes').value = b.notes || '';
  const btn = document.getElementById('benAddBtn');
  btn.innerHTML = '<i class="fas fa-save mr-2"></i>Update Beneficiary';
  btn.onclick = async function() {
    const errDiv = document.getElementById('benFormError');
    const sucDiv = document.getElementById('benFormSuccess');
    errDiv.classList.add('hidden');
    sucDiv.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Updating...';
    try {
      const result = await apiFetch('/api/beneficiaries/' + id, {
        method: 'PUT',
        body: JSON.stringify({
          name: document.getElementById('benName').value.trim(),
          nickname: document.getElementById('benNickname').value.trim(),
          account_number: document.getElementById('benAccount').value.trim(),
          bank_name: document.getElementById('benBank').value.trim(),
          swift_code: document.getElementById('benSwift').value.trim().toUpperCase(),
          country: document.getElementById('benCountry').value,
          currency: document.getElementById('benCurrency').value,
          beneficiary_type: document.getElementById('benType').value,
          notes: document.getElementById('benNotes').value.trim(),
        })
      });
      sucDiv.textContent = 'Beneficiary updated!';
      sucDiv.classList.remove('hidden');
      ['benName','benNickname','benAccount','benBank','benSwift','benNotes'].forEach(fid => document.getElementById(fid).value = '');
      btn.innerHTML = '<i class="fas fa-plus mr-2"></i>Add Beneficiary';
      btn.onclick = addBeneficiary;
      loadBeneficiaries();
      setTimeout(() => sucDiv.classList.add('hidden'), 4000);
    } catch (e) {
      errDiv.textContent = e.message || 'Update failed.';
      errDiv.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  };
  document.getElementById('beneficiaryForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteBeneficiary(id, name) {
  if (!confirm(`Delete beneficiary "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch('/api/beneficiaries/' + id, { method: 'DELETE' });
    loadBeneficiaries();
  } catch (e) {
    alert('Delete failed: ' + (e.message || 'Unknown error'));
  }
}

function selectBeneficiary(name) {
  const sel = document.getElementById('payBeneficiary');
  if (sel) {
    sel.value = name;
    onBeneficiarySelect(sel);
    switchTab('payments');
  }
}

function sendToSuspiciousBeneficiary(name) {
  if (!confirm(`⚠ WARNING: "${name}" is on the watchlist.\n\nIf you proceed, the transaction will be automatically BLOCKED and escalated to Compliance for investigation.\n\nDo you want to continue?`)) return;
  selectBeneficiary(name);
}
