// ============================================================
// Virtual Cards
// ============================================================
async function requestCard() {
  const btn = document.getElementById('cardReqBtn');
  const msg = document.getElementById('cardReqMsg');
  btn.disabled = true;
  msg.classList.add('hidden');
  try {
    await apiFetch('/api/cards/request', { method: 'POST', body: JSON.stringify({
      label: document.getElementById('cardLabel').value || 'Virtual Card',
      card_type: document.getElementById('cardType').value || 'debit',
      card_network: document.getElementById('cardNetwork').value || 'Visa',
      spending_limit: parseFloat(document.getElementById('cardLimit').value) || 5000,
    })});
    msg.className = 'text-xs rounded-lg px-3 py-2 bg-green-500/20 text-green-600';
    msg.textContent = '✔ Request submitted! An admin will review and activate your card shortly.';
    msg.classList.remove('hidden');
    loadCards();
  } catch (e) {
    msg.className = 'text-xs rounded-lg px-3 py-2 bg-red-500/20 text-red-500';
    msg.textContent = '✘ ' + (e.message || 'Request failed');
    msg.classList.remove('hidden');
  }
  btn.disabled = false;
}

async function loadCardRequests() {
  try {
    const data = await apiFetch('/api/cards/requests');
    const div = document.getElementById('cardRequestsList');
    if (!data.requests || !data.requests.length) {
      div.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">No pending card requests.</p>';
      return;
    }
    div.innerHTML = data.requests.map(r => `
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-sm font-semibold text-gray-800">${r.username}</p>
            <p class="text-xs text-gray-500">${r.label || 'Virtual Card'} · ${r.card_type} · ${r.card_network}</p>
          </div>
          <span class="badge bg-amber-100 text-amber-700 text-xs">Pending</span>
        </div>
        <p class="text-xs text-gray-500 mb-3">Limit: $${Number(r.spending_limit).toLocaleString()} · Requested: ${new Date(r.created_at).toLocaleDateString()}</p>
        <div class="flex gap-2">
          <button onclick="approveCard('${r.id}')" class="flex-1 py-1.5 rounded text-xs bg-green-500/20 text-green-600 hover:bg-green-500/30 font-semibold"><i class="fas fa-check mr-1"></i>Approve</button>
          <button onclick="rejectCard('${r.id}')" class="flex-1 py-1.5 rounded text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold"><i class="fas fa-times mr-1"></i>Reject</button>
        </div>
      </div>`).join('');
  } catch (e) { console.error(e); }
}

async function approveCard(id) {
  try {
    await apiFetch(`/api/cards/${id}/approve`, { method: 'POST' });
    loadCardRequests();
    loadCards();
  } catch (e) { alert(e.message || 'Approval failed'); }
}

async function rejectCard(id) {
  const reason = prompt('Rejection reason (optional):') ?? '';
  try {
    await apiFetch(`/api/cards/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    loadCardRequests();
  } catch (e) { alert(e.message || 'Rejection failed'); }
}

async function loadCards() {
  try {
    const data = await apiFetch('/api/cards');
    const div = document.getElementById('cardsList');
    if (!data.cards.length) { div.innerHTML = '<p class="text-gray-600 text-sm text-center py-8 col-span-2">No virtual cards yet.</p>'; return; }
    div.innerHTML = data.cards.map(c => {
      const frozen = c.status === 'frozen';
      const cancelled = c.status === 'cancelled';
      const pending = c.status === 'pending_approval';
      const borderColor = cancelled ? 'border-red-500/30' : frozen ? 'border-yellow-500/30' : pending ? 'border-amber-400/40' : 'border-accent/30';
      const networkIcon = c.card_network === 'Visa' ? 'fab fa-cc-visa' : 'fab fa-cc-mastercard';
      if (pending) {
        return `<div class="bg-gradient-to-br from-amber-50 to-gray-100 rounded-xl p-5 border ${borderColor} relative opacity-80">
          <div class="absolute top-2 right-2 badge bg-amber-100 text-amber-700 text-xs">PENDING APPROVAL</div>
          <div class="flex justify-between items-start mb-6">
            <span class="text-xs text-gray-500">${c.label || 'Virtual Card'}</span>
            <i class="${networkIcon} text-2xl text-gray-300"></i>
          </div>
          <p class="text-gray-400 font-mono text-lg tracking-[0.2em] mb-4">•••• •••• •••• ••••</p>
          <div class="flex justify-between items-end">
            <div><p class="text-[10px] text-gray-400 uppercase">Expires</p><p class="text-gray-400 text-sm font-mono">••/••</p></div>
            <div><p class="text-[10px] text-gray-400 uppercase">Limit</p><p class="text-gray-600 text-sm font-mono">$${Number(c.spending_limit).toLocaleString()}</p></div>
          </div>
          <p class="text-xs text-amber-600 mt-3 text-center"><i class="fas fa-clock mr-1"></i>Awaiting admin approval</p>
        </div>`;
      }
      return `<div class="bg-gradient-to-br ${cancelled ? 'from-dark-700 to-dark-800' : frozen ? 'from-yellow-900/20 to-dark-800' : 'from-dark-600 to-dark-800'} rounded-xl p-5 border ${borderColor} relative">
        ${frozen ? '<div class="absolute top-2 right-2 badge bg-yellow-500/20 text-yellow-400">FROZEN</div>' : ''}
        ${cancelled ? '<div class="absolute top-2 right-2 badge bg-red-500/20 text-red-400">CANCELLED</div>' : ''}
        <div class="flex justify-between items-start mb-6">
          <span class="text-xs text-gray-500">${c.label || 'Virtual Card'}</span>
          <i class="${networkIcon} text-2xl text-gray-400"></i>
        </div>
        <p class="text-gray-800 font-mono text-lg tracking-[0.2em] mb-4">${c.card_number}</p>
        <div class="flex justify-between items-end">
          <div><p class="text-[10px] text-gray-500 uppercase">Expires</p><p class="text-gray-800 text-sm font-mono">${String(c.expiry_month).padStart(2,'0')}/${c.expiry_year}</p></div>
          <div><p class="text-[10px] text-gray-500 uppercase">Limit</p><p class="text-gray-800 text-sm font-mono">$${Number(c.spending_limit).toLocaleString()}</p></div>
        </div>
        ${!cancelled ? `<div class="flex gap-2 mt-4 pt-3 border-t border-gray-200">
          <button onclick="freezeCard('${c.id}')" class="flex-1 py-1.5 rounded text-xs ${frozen ? 'bg-accent/20 text-accent' : 'bg-yellow-500/20 text-yellow-400'} hover:opacity-80"><i class="fas fa-${frozen ? 'play' : 'pause'} mr-1"></i>${frozen ? 'Unfreeze' : 'Freeze'}</button>
          <button onclick="provisionCard('${c.id}')" class="flex-1 py-1.5 rounded text-xs bg-blue-500/20 text-blue-400 hover:opacity-80"><i class="fab fa-apple mr-1"></i>Wallet</button>
          <button onclick="cancelCard('${c.id}')" class="py-1.5 px-2 rounded text-xs bg-red-500/10 text-red-400 hover:opacity-80"><i class="fas fa-times"></i></button>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch (e) { console.error(e); }
}

async function generateCard() {
  try {
    const result = await apiFetch('/api/cards/generate', { method: 'POST', body: JSON.stringify({
      label: document.getElementById('cardLabel').value || 'Virtual Card',
      spending_limit: parseFloat(document.getElementById('cardLimit').value) || 5000,
    })});
    const genDiv = document.getElementById('cardGenResult');
    genDiv.classList.remove('hidden');
    document.getElementById('cardGenNumber').textContent = '•••• •••• •••• ' + result.last_four;
    document.getElementById('cardGenExpiry').textContent = 'Exp: ' + result.expiry;
    document.getElementById('cardGenCVV').textContent = 'CVV: ' + result.cvv;
    loadCards();
  } catch (e) { alert(e.message); }
}

async function freezeCard(id) { await apiFetch('/api/cards/' + id + '/freeze', { method: 'POST' }); loadCards(); }
async function cancelCard(id) { if (confirm('Cancel this card permanently?')) { await apiFetch('/api/cards/' + id, { method: 'DELETE' }); loadCards(); } }
async function provisionCard(id) {
  const result = await apiFetch('/api/cards/' + id + '/provision', { method: 'POST', body: JSON.stringify({ wallet: 'apple' }) });
  alert(result.message);
}
