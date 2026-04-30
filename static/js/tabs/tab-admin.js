// ============================================================
// Admin - HITL (Approvals Tab Card View)
// ============================================================
async function loadApprovals() {
  const pendingContainer  = document.getElementById('approvals-list');
  const approvedContainer = document.getElementById('approved-list');
  try {
    const data = await apiFetch('/api/hitl/queue');
    const queue = data.queue || [];

    const pending  = queue.filter(i => ['pending','awaiting_second_approval'].includes(i.status));
    const approved = queue.filter(i => i.status === 'approved');
    const rejected = queue.filter(i => i.status === 'rejected');

    const pendingBadge  = document.getElementById('pending-count-badge');
    const approvedBadge = document.getElementById('approved-count-badge');
    if (pending.length > 0) {
      pendingBadge.textContent = pending.length + ' awaiting action';
      pendingBadge.classList.remove('hidden');
    } else {
      pendingBadge.classList.add('hidden');
    }
    if (approved.length > 0) {
      approvedBadge.textContent = approved.length + ' approved';
      approvedBadge.classList.remove('hidden');
    } else {
      approvedBadge.classList.add('hidden');
    }

    function renderCard(item, showActions) {
      const needsThreeEyes   = item.amount >= 150000;
      const isAwaitingSecond = item.status === 'awaiting_second_approval';
      const statusColor = item.status === 'pending'
        ? 'bg-yellow-100 text-yellow-700'
        : isAwaitingSecond
          ? 'bg-orange-100 text-orange-700'
          : item.status === 'approved'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700';
      const approverInfo = item.first_approver ? ' · 1st: ' + item.first_approver : '';
      const reviewedInfo = item.reviewed_by
        ? `<div class="text-xs text-gray-400 mt-1"><i class="fas fa-user-check mr-1"></i>${item.reviewed_by}${item.reviewed_at ? ' · ' + item.reviewed_at.substring(0,16).replace('T',' ') : ''}</div>`
        : '';

      const caseSection = item.case_number ? (() => {
        const cs = item.case_status || 'open';
        const caseBlocked = !['resolved','closed'].includes(cs);
        const caseColor = caseBlocked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700';
        const caseIcon  = caseBlocked ? 'fa-lock' : 'fa-check-circle';
        return `<div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs ${caseColor}"><i class="fas ${caseIcon}"></i>Case ${item.case_number} — ${cs.toUpperCase()}${caseBlocked ? ' · Resolve case to unlock approval' : ''}</div>
          <button onclick="viewCaseFromApprovals('${item.case_number}')" class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${caseBlocked ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}"><i class="fas fa-folder-open"></i>View Case</button>
        </div>`;
      })() : '';

      const actionsHtml = (() => {
        if (!showActions) return reviewedInfo;
        const cs = item.case_status || 'open';
        const caseBlocked = item.case_number && !['resolved','closed'].includes(cs);
        return `<div class="flex gap-2 mt-2">
          <button onclick="hitlAction('approve','${item.id}')" ${caseBlocked ? 'disabled title="Resolve compliance case first"' : ''} class="px-3 py-1 rounded text-white text-xs ${caseBlocked ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}">${isAwaitingSecond ? '<i class=\'fas fa-check-double mr-1\'></i>2nd Approve' : '<i class=\'fas fa-check mr-1\'></i>Approve'}</button>
          <button onclick="hitlAction('reject','${item.id}')" ${caseBlocked ? 'disabled title="Resolve compliance case first"' : ''} class="px-3 py-1 rounded text-white text-xs ${caseBlocked ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}"><i class='fas fa-times mr-1'></i>Reject</button>
        </div>`;
      })();

      return `
      <div class="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm transition-all duration-300" data-hitl-id="${item.id}">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-1">
            <span class="font-mono text-xs text-gray-400">#${item.id.substring(0,8)}…</span>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}">${item.status.replace(/_/g,' ').toUpperCase()}</span>
            ${needsThreeEyes ? '<span class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium"><i class="fas fa-eye mr-1"></i>3-EYES</span>' : ''}
          </div>
          <div class="text-sm font-semibold text-gray-800">${item.beneficiary_name || 'Unknown Beneficiary'}</div>
          <div class="text-xs text-gray-500 mt-0.5">${item.reason || 'Flagged for review'} &nbsp;·&nbsp; Risk Score: <span class="text-red-500 font-medium">${(item.risk_score||0).toFixed(1)}</span>${approverInfo}</div>
          ${caseSection}
        </div>
        <div class="text-right ml-6">
          <div class="text-lg font-bold text-gray-800">$${Number(item.amount).toLocaleString()}</div>
          ${actionsHtml}
        </div>
      </div>`;
    }

    if (pending.length === 0) {
      pendingContainer.innerHTML = '<div class="text-sm text-gray-400 italic py-3 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">No payments are currently awaiting approval.</div>';
    } else {
      pendingContainer.innerHTML = pending.map(item => renderCard(item, true)).join('');
    }

    const approvedAndRejected = [...approved, ...rejected].sort((a,b) =>
      (b.reviewed_at || b.created_at || '').localeCompare(a.reviewed_at || a.created_at || ''));

    if (approvedAndRejected.length === 0) {
      approvedContainer.innerHTML = '<div class="text-sm text-gray-400 italic py-3 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">No completed approvals yet.</div>';
    } else {
      approvedContainer.innerHTML = approvedAndRejected.map(item => renderCard(item, false)).join('');
    }

  } catch(e) {
    pendingContainer.innerHTML  = '<div class="text-sm text-red-400">Failed to load approvals.</div>';
    approvedContainer.innerHTML = '';
  }
}

// ============================================================
// Admin - HITL (Table View)
// ============================================================
async function loadHITL() {
  try {
    const data = await apiFetch('/api/hitl/queue');
    const tbody = document.getElementById('hitlBody');
    if (!data.queue || data.queue.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-gray-600">No items in queue</td></tr>';
      return;
    }
    tbody.innerHTML = data.queue.map(item => {
      const needsFourEyes = item.amount >= 150000;
      let fourEyesBadge;
      if (!needsFourEyes) {
        fourEyesBadge = `<span class="text-xs text-gray-600">N/A</span>`;
      } else if (item.four_eyes_status === 'completed') {
        fourEyesBadge = `<span class="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-xs"><i class="fas fa-check-double mr-1"></i>2/2 ✓</span>`;
      } else if (item.first_approver) {
        fourEyesBadge = `<span class="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs"><i class="fas fa-eye mr-1"></i>1/2 — ${item.first_approver}</span>`;
      } else {
        fourEyesBadge = `<span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs"><i class="fas fa-eye mr-1"></i>4-Eyes Required</span>`;
      }
      return `<tr class="border-b border-gray-200/50 hover:bg-gray-50 transition-all duration-300" data-hitl-id="${item.id}">
        <td class="py-2 px-2 font-mono">${item.id.substring(0, 8)}...</td>
        <td class="py-2 px-2">${item.beneficiary_name || 'N/A'}</td>
        <td class="py-2 px-2 text-right">$${Number(item.amount).toLocaleString()}</td>
        <td class="py-2 px-2 text-right font-mono text-red-400">${(item.risk_score || 0).toFixed(1)}</td>
        <td class="py-2 px-2 text-yellow-400">${item.reason || ''}</td>
        <td class="py-2 px-2 text-center">${fourEyesBadge}</td>
        <td class="py-2 px-2 text-center"><span class="status-${item.status} uppercase text-xs font-medium">${item.status}</span></td>
        <td class="py-2 px-2 text-center">
          ${(() => {
            const cs = item.case_status || 'open';
            const caseBlocked = item.case_number && !['resolved','closed'].includes(cs);
            const lockTip = caseBlocked ? `title="Case ${item.case_number} is ${cs} — resolve it first"` : '';
            const isPending = item.status === 'pending' || item.status === 'awaiting_second_approval';
            return `<div class="flex gap-1 justify-center flex-wrap">
              ${item.case_number ? `
                <span class="w-full text-center mb-1 text-[10px] px-1.5 py-0.5 rounded ${caseBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">
                  <i class="fas ${caseBlocked ? 'fa-lock' : 'fa-lock-open'} mr-0.5"></i>${item.case_number}: ${cs}
                </span>` : ''}
              ${isPending ? `
                <button onclick="hitlAction('approve', '${item.id}')" ${caseBlocked ? `disabled ${lockTip}` : ''} class="px-2 py-1 rounded text-white text-xs ${caseBlocked ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}">${item.status === 'awaiting_second_approval' ? '2nd Approve' : 'Approve'}</button>
                <button onclick="hitlAction('reject', '${item.id}')" ${caseBlocked ? `disabled ${lockTip}` : ''} class="px-2 py-1 rounded text-white text-xs ${caseBlocked ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}">Reject</button>
              ` : `<span class="text-xs text-gray-500 w-full text-center">${item.reviewed_by || ''}</span>`}
              ${item.case_number ? `
                <button onclick="viewCaseFromApprovals('${item.case_number}')" class="w-full mt-1 px-2 py-1 rounded text-xs font-semibold border ${caseBlocked ? 'border-red-400 text-red-500 hover:bg-red-50' : 'border-blue-300 text-blue-500 hover:bg-blue-50'}">
                  <i class="fas fa-folder-open mr-1"></i>View Case
                </button>` : ''}
            </div>`;
          })()}
        </td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('HITL error:', e); }
}

async function hitlAction(action, id) {
  // ── Immediate visual feedback: mark the card as processing ──────
  const cardEl = document.querySelector(`[data-hitl-id="${id}"]`);
  if (cardEl) {
    cardEl.style.opacity = '0.5';
    cardEl.style.pointerEvents = 'none';
    const btns = cardEl.querySelectorAll('button');
    btns.forEach(b => { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; });
  }

  try {
    const result = await apiFetch(`/api/hitl/${action}/${id}`, { method: 'POST' });

    if (result.status === 'awaiting_second_approval') {
      const notice = document.getElementById('approvalNotice');
      if (notice) {
        notice.textContent = '⚠️ First approval recorded. A second approver must confirm this transaction (4-eyes control).';
        notice.classList.remove('hidden');
        setTimeout(() => notice.classList.add('hidden'), 6000);
      }
      await loadApprovals();
      loadHITL();
      return;
    }

    if (action === 'approve' && result.sender_new_balance !== undefined) {
      BALANCE = result.sender_new_balance;
      localStorage.setItem('ipts_balance', BALANCE.toString());
      updateHeaderInfo();
      const balEl = document.getElementById('paySenderBalance');
      if (balEl) balEl.textContent = '$' + Number(BALANCE).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    // ── Immediately remove the card from Pending Approvals ──────────
    if (cardEl) {
      cardEl.style.transition = 'opacity 0.3s, transform 0.3s';
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'translateX(40px)';
      setTimeout(() => cardEl.remove(), 320);
    }

    // ── Show toast confirmation ─────────────────────────────────────
    const label = action === 'approve' ? '✔ Transaction approved and settled' : '✖ Transaction rejected';
    const toastType = action === 'approve' ? 'success' : 'warning';
    if (typeof showToast === 'function') showToast(label, toastType);

    // ── Show payment journey for approve ───────────────────────────
    if (action === 'approve' && result.status === 'approved') {
      window._pendingFlowHitlId = null;
      showPaymentFlow('hitl_approved', { tx_hash: result.tx_hash });
    }

    // ── Full refresh: Approvals tab, Admin HITL table, dashboard ───
    await loadApprovals();
    loadHITL();
    loadDashboard();
    await fetchAccountInfo();

    // ── Update pending count badge to 0 if nothing left ────────────
    const pendingList = document.getElementById('approvals-list');
    if (pendingList) {
      const remaining = pendingList.querySelectorAll('[data-hitl-id]').length;
      const badge = document.getElementById('pending-count-badge');
      if (badge) {
        if (remaining === 0) { badge.classList.add('hidden'); }
        else { badge.textContent = remaining + ' awaiting action'; }
      }
    }

  } catch (e) {
    // Restore card on error
    if (cardEl) { cardEl.style.opacity = '1'; cardEl.style.pointerEvents = ''; }

    if (e.data && e.data.blocked_by === 'compliance_case') {
      const notice = document.getElementById('approvalNotice');
      if (notice) {
        notice.className = 'mb-4 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 border border-red-200 text-red-700';
        notice.innerHTML = `<i class="fas fa-lock mr-2"></i><strong>Approval blocked:</strong> Case <strong>${e.data.case_number}</strong> is currently <strong>${e.data.case_status}</strong>. Resolve the compliance case first before approving this transaction.`;
        notice.classList.remove('hidden');
      } else {
        alert(`Approval blocked\n\nCase ${e.data.case_number} must be resolved before this transaction can be approved.\n\nCurrent case status: ${e.data.case_status}`);
      }
    } else {
      alert('Error: ' + e.message);
    }
  }
}

// ============================================================
// Admin - Audit
// ============================================================
async function loadAudit() {
  try {
    const data = await apiFetch('/api/audit/log');
    const tbody = document.getElementById('auditBody');
    if (!data.entries || data.entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-gray-600">No audit entries</td></tr>';
      return;
    }
    tbody.innerHTML = data.entries.map(e => `
      <tr class="border-b border-gray-200/50">
        <td class="py-1.5 px-2 text-gray-500">${e.created_at || ''}</td>
        <td class="py-1.5 px-2"><span class="px-2 py-0.5 rounded text-xs bg-gray-200">${e.event_type}</span></td>
        <td class="py-1.5 px-2 text-accent">${e.actor}</td>
        <td class="py-1.5 px-2 text-gray-500 font-mono truncate max-w-xs">${e.details || ''}</td>
      </tr>
    `).join('');
  } catch (e) { console.error('Audit error:', e); }
}

// ============================================================
// Admin — User Management & System Stats
// ============================================================
const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700', operator: 'bg-blue-100 text-blue-700',
  compliance: 'bg-yellow-100 text-yellow-700', client: 'bg-green-100 text-green-700',
  auditor: 'bg-gray-100 text-gray-600', datascientist: 'bg-pink-100 text-pink-700',
};
const VALID_ROLES = ['admin','operator','compliance','client','auditor','datascientist'];

async function loadSystemStats() {
  try {
    const d = await apiFetch('/api/admin/system-stats');
    document.getElementById('systemStatsGrid').innerHTML = [
      { icon: 'fa-exchange-alt', color: 'text-accent',   label: 'Total Transactions', value: d.total_transactions.toLocaleString() },
      { icon: 'fa-dollar-sign',  color: 'text-green-500',label: 'Total Volume',        value: '$' + Number(d.total_volume).toLocaleString() },
      { icon: 'fa-ban',          color: 'text-red-500',  label: 'Blocked Txns',        value: d.blocked_transactions },
      { icon: 'fa-clock',        color: 'text-amber-500',label: 'Pending Review',      value: d.pending_review },
      { icon: 'fa-folder-open',  color: 'text-orange-500',label:'Open Cases',          value: d.open_cases },
      { icon: 'fa-credit-card',  color: 'text-blue-500', label: 'Card Requests',       value: d.pending_card_requests },
      { icon: 'fa-users',        color: 'text-indigo-500',label:'Total Users',         value: d.total_users },
      { icon: 'fa-vault',        color: 'text-purple-500',label:'System Balance',      value: '$' + Number(d.total_system_balance).toLocaleString() },
    ].map(s => `<div class="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
      <i class="fas ${s.icon} ${s.color} text-lg w-5 text-center"></i>
      <div><p class="text-[10px] text-gray-500 uppercase leading-none">${s.label}</p><p class="text-sm font-bold text-gray-800 mt-0.5">${s.value}</p></div>
    </div>`).join('');
  } catch (e) { console.error(e); }
}

async function loadAdminUsers() {
  try {
    const d = await apiFetch('/api/admin/users');
    const tbody = document.getElementById('adminUsersBody');
    const countBadge = document.getElementById('adminUserCount');
    if (countBadge) countBadge.textContent = `${d.users.length} users`;
    if (!d.users.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-400">No users found</td></tr>'; return; }
    tbody.innerHTML = d.users.map(u => {
      const roleClass = ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600';
      const roleOpts = VALID_ROLES.map(r => `<option value="${r}"${r===u.role?' selected':''}>${r}</option>`).join('');
      const isMe = u.username === USER;
      const isAdmin = u.username === 'mohamad';
      const locked = u.locked;
      const canBulk = !isAdmin && !isMe;
      const statusBadge = locked
        ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><i class="fas fa-lock mr-1"></i>Locked</span>`
        : `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><i class="fas fa-lock-open mr-1"></i>Active</span>`;
      const lockBtn = isAdmin || isMe ? '' : locked
        ? `<button onclick="toggleUserLock('${u.username}','unlock')" class="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"><i class="fas fa-lock-open mr-1"></i>Unlock</button>`
        : `<button onclick="toggleUserLock('${u.username}','lock')" class="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"><i class="fas fa-lock mr-1"></i>Lock</button>`;
      const resetBtn = isAdmin || isMe ? '' :
        `<button onclick="resetUserPassword('${u.username}')" class="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition"><i class="fas fa-key mr-1"></i>Reset PW</button>`;
      return `<tr class="border-b border-gray-100 hover:bg-gray-50 ${locked ? 'opacity-60' : ''}">
        <td class="py-2 px-2">${canBulk ? `<input type="checkbox" class="bulk-user-cb rounded" data-username="${u.username}" onchange="updateBulkBar()"/>` : ''}</td>
        <td class="py-2 px-2">
          <p class="font-semibold text-gray-800">${u.full_name}</p>
          <p class="text-gray-400">@${u.username}</p>
        </td>
        <td class="py-2 px-2">
          ${isMe || isAdmin
            ? `<span class="badge text-xs px-2 py-0.5 rounded-full ${roleClass}">${u.role}</span>`
            : `<select onchange="changeUserRole('${u.username}',this.value)" class="text-xs border border-gray-200 rounded px-2 py-1 ${roleClass}">
                ${roleOpts}
               </select>`
          }
        </td>
        <td class="py-2 px-2 text-center">${isAdmin ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"><i class="fas fa-shield-halved mr-1"></i>Protected</span>` : statusBadge}</td>
        <td class="py-2 px-2 text-right">${u.tx_count}</td>
        <td class="py-2 px-2 text-right">${u.card_count}</td>
        <td class="py-2 px-2 text-center flex gap-1 flex-wrap justify-center">${lockBtn}${resetBtn}</td>
      </tr>`;
    }).join('');
  } catch (e) { console.error(e); }
}

async function changeUserRole(username, newRole) {
  try {
    await apiFetch(`/api/admin/users/${username}/role`, { method: 'POST', body: JSON.stringify({ role: newRole }) });
    showToast(`✔ ${username}'s role updated to ${newRole}`, 'success');
    loadAdminUsers();
  } catch (e) { showToast(e.message || 'Failed to update role', 'error'); loadAdminUsers(); }
}

async function toggleUserLock(username, action) {
  if (username === 'mohamad') { showToast('The admin account cannot be locked.', 'error'); return; }
  const confirm = window.confirm(`${action === 'lock' ? 'Lock' : 'Unlock'} account @${username}?`);
  if (!confirm) return;
  try {
    await apiFetch(`/api/admin/users/${username}/${action}`, { method: 'POST' });
    showToast(`✔ @${username} has been ${action === 'lock' ? 'locked' : 'unlocked'}.`, 'success');
    loadAdminUsers();
  } catch (e) {
    showToast('✘ ' + (e.message || `Failed to ${action} user`), 'error');
  }
}

// ============================================================
// Feature 1 — Active Sessions
// ============================================================
async function loadSessions() {
  try {
    const d = await apiFetch('/api/admin/sessions');
    const tbody = document.getElementById('sessionsBody');
    const badge = document.getElementById('sessionCountBadge');
    if (badge) badge.textContent = d.count || 0;
    if (!d.sessions || !d.sessions.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-400">No active sessions</td></tr>';
      return;
    }
    // Get current jti from stored token
    let myJti = '';
    try {
      const tok = localStorage.getItem('ipts_token');
      if (tok) { const p = JSON.parse(atob(tok.split('.')[1])); myJti = p.jti || ''; }
    } catch(e) {}
    tbody.innerHTML = d.sessions.map(s => {
      const isMe = s.jti === myJti || s.username === USER;
      const loginAt = s.login_at ? s.login_at.substring(0,19).replace('T',' ') : '';
      const lastSeen = s.last_seen ? s.last_seen.substring(0,19).replace('T',' ') : '';
      return `<tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-2 px-2 font-semibold text-gray-800">${s.username} <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] ${ROLE_COLORS[s.role]||'bg-gray-100 text-gray-600'}">${s.role}</span>${isMe ? ' <span class="text-[10px] text-blue-500">(you)</span>' : ''}</td>
        <td class="py-2 px-2 font-mono text-gray-500">${s.ip}</td>
        <td class="py-2 px-2 text-gray-500">${loginAt}</td>
        <td class="py-2 px-2 text-gray-500">${lastSeen}</td>
        <td class="py-2 px-2 text-center">
          <button onclick="revokeSession('${s.jti}')" ${isMe ? 'disabled title="Cannot revoke your own session"' : ''} class="text-xs px-2 py-1 rounded ${isMe ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200 transition'}"><i class="fas fa-right-from-bracket mr-1"></i>Force Logout</button>
        </td>
      </tr>`;
    }).join('');
  } catch(e) { console.error('Sessions error:', e); }
}

async function revokeSession(jti) {
  if (!confirm('Force logout this session?')) return;
  try {
    await apiFetch(`/api/admin/sessions/${jti}/revoke`, { method: 'POST' });
    showToast('Session revoked', 'success');
    loadSessions();
  } catch(e) { showToast(e.message || 'Failed to revoke session', 'error'); }
}

// ============================================================
// Feature 2 — Password Reset
// ============================================================
async function resetUserPassword(username) {
  if (!confirm(`Reset password for @${username}? A temporary password will be shown once.`)) return;
  try {
    const d = await apiFetch(`/api/admin/users/${username}/reset-password`, { method: 'POST' });
    document.getElementById('pwResetValue').textContent = d.temp_password;
    document.getElementById('pwResetModal').classList.remove('hidden');
  } catch(e) { showToast(e.message || 'Failed to reset password', 'error'); }
}

function copyTempPassword() {
  const val = document.getElementById('pwResetValue').textContent;
  navigator.clipboard.writeText(val).then(() => showToast('Copied to clipboard', 'success'));
}

async function submitForcePasswordChange() {
  const current = document.getElementById('fcpCurrent').value;
  const newPw = document.getElementById('fcpNew').value;
  if (!current || !newPw) { showToast('Fill in both fields', 'error'); return; }
  try {
    await apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: current, new_password: newPw }) });
    showToast('Password changed successfully', 'success');
    document.getElementById('forceChangePasswordModal').classList.add('hidden');
  } catch(e) { showToast(e.message || 'Failed to change password', 'error'); }
}

// ============================================================
// Feature 3 — Maintenance Mode
// ============================================================
async function toggleMaintenance(enabled) {
  try {
    const d = await apiFetch('/api/admin/maintenance', { method: 'POST', body: JSON.stringify({ enabled }) });
    const statusEl = document.getElementById('maintenanceStatus');
    if (statusEl) statusEl.textContent = d.enabled ? 'ON' : 'OFF';
    showToast(`Maintenance mode ${d.enabled ? 'ENABLED' : 'DISABLED'}`, d.enabled ? 'warning' : 'success');
  } catch(e) { showToast(e.message || 'Failed to toggle maintenance mode', 'error'); }
}

async function loadMaintenanceState() {
  try {
    const d = await fetch((typeof API !== 'undefined' ? API : '') + '/api/admin/maintenance').then(r => r.json());
    const toggle = document.getElementById('maintenanceToggle');
    const statusEl = document.getElementById('maintenanceStatus');
    if (toggle) toggle.checked = d.enabled;
    if (statusEl) statusEl.textContent = d.enabled ? 'ON' : 'OFF';
    // Show banner for non-admin users
    const banner = document.getElementById('maintenanceBanner');
    if (banner) {
      if (d.enabled && typeof ROLE !== 'undefined' && ROLE !== 'admin') {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  } catch(e) {}
}

// ============================================================
// Feature 4 — Role Permission Matrix
// ============================================================
function toggleRoleMatrix() {
  const content = document.getElementById('roleMatrixContent');
  const chevron = document.getElementById('roleMatrixChevron');
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    chevron.innerHTML = '<i class="fas fa-chevron-up"></i>';
    renderRoleMatrix();
  } else {
    content.classList.add('hidden');
    chevron.innerHTML = '<i class="fas fa-chevron-down"></i>';
  }
}

function renderRoleMatrix() {
  const roles = ['admin', 'compliance', 'operator', 'auditor', 'datascientist', 'client'];
  const features = [
    { label: 'Dashboard',     tab: 'dashboard' },
    { label: 'Payments',      tab: 'payments' },
    { label: 'Beneficiaries', tab: 'beneficiaries' },
    { label: 'Approvals',     tab: 'approvals' },
    { label: 'AI Engine',     tab: 'aiml' },
    { label: 'Compliance',    tab: 'compliance' },
    { label: 'Cases',         tab: 'cases' },
    { label: 'Security',      tab: 'security' },
    { label: 'Cards',         tab: 'cards' },
    { label: 'Admin',         tab: 'admin' },
    { label: 'Ledger',        tab: 'ledger' },
    { label: 'AML',           tab: 'aml' },
    { label: 'Corridors',     tab: 'corridors' },
    { label: 'DS Workbench',  tab: 'dsworkbench' },
    { label: 'Graph',         tab: 'graph' },
    { label: 'MLOps',         tab: 'mlops' },
  ];
  const tabAccess = {
    admin:         ['dashboard','approvals','aiml','compliance','cases','security','cards','admin','ledger','aml','corridors','dsworkbench','graph','mlops'],
    operator:      ['dashboard','approvals','ledger','security','cards','corridors'],
    compliance:    ['dashboard','approvals','compliance','cases','aml','ledger','aiml','security','graph'],
    client:        ['dashboard','payments','beneficiaries','cards','documents','spending360','security'],
    auditor:       ['dashboard','compliance','cases','aml','ledger','aiml','graph'],
    datascientist: ['dashboard','dsworkbench','aiml','mlops','aml','ledger','graph'],
  };
  const roleColors = { admin:'text-purple-600', compliance:'text-yellow-600', operator:'text-blue-600', auditor:'text-gray-600', datascientist:'text-pink-600', client:'text-green-600' };
  let html = `<table class="w-full text-xs border-collapse">
    <thead>
      <tr class="bg-gray-50">
        <th class="text-left py-2 px-3 border border-gray-200 font-semibold text-gray-700">Feature</th>
        ${roles.map(r => `<th class="py-2 px-3 border border-gray-200 text-center font-semibold ${roleColors[r]||''}">${r}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${features.map((f, i) => `
        <tr class="${i%2===0?'bg-white':'bg-gray-50'}">
          <td class="py-1.5 px-3 border border-gray-200 font-medium text-gray-700">${f.label}</td>
          ${roles.map(r => {
            const has = (tabAccess[r]||[]).includes(f.tab);
            return `<td class="py-1.5 px-3 border border-gray-200 text-center">${has ? '<span class="text-green-500 font-bold">&#10003;</span>' : '<span class="text-gray-300">&mdash;</span>'}</td>`;
          }).join('')}
        </tr>`).join('')}
    </tbody>
  </table>`;
  document.getElementById('roleMatrixContent').innerHTML = html;
}

// ============================================================
// Feature 5 — Failed Login Monitor
// ============================================================
let _failedLoginInterval = null;

async function loadFailedLogins() {
  try {
    const d = await apiFetch('/api/admin/failed-logins');
    const tbody = document.getElementById('failedLoginsBody');
    const badge = document.getElementById('failedLoginBadge');
    if (badge) {
      badge.textContent = d.count_24h || 0;
      badge.classList.toggle('hidden', !d.count_24h);
    }
    if (!d.entries || !d.entries.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">No failed logins</td></tr>';
      return;
    }
    // Count per username to detect brute force
    const userCounts = {};
    d.entries.forEach(e => { userCounts[e.username] = (userCounts[e.username] || 0) + 1; });
    tbody.innerHTML = d.entries.map(e => {
      const brute = userCounts[e.username] >= 3;
      const rowClass = brute ? 'bg-red-50' : '';
      const ts = e.created_at ? e.created_at.substring(0,19).replace('T',' ') : '';
      return `<tr class="border-b border-gray-100 ${rowClass}">
        <td class="py-1.5 px-2 text-gray-500 font-mono">${ts}</td>
        <td class="py-1.5 px-2 font-semibold text-gray-800">${e.username}${brute ? ' <span class="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600 ml-1">Brute Force?</span>' : ''}</td>
        <td class="py-1.5 px-2 font-mono text-gray-500">${e.ip}</td>
        <td class="py-1.5 px-2 text-gray-400">${e.reason}</td>
      </tr>`;
    }).join('');
  } catch(e) { console.error('Failed logins error:', e); }
}

// ============================================================
// Feature 6 — Bulk User Actions
// ============================================================
function toggleSelectAll(cb) {
  document.querySelectorAll('.bulk-user-cb').forEach(el => { el.checked = cb.checked; });
  updateBulkBar();
}

function updateBulkBar() {
  const selected = Array.from(document.querySelectorAll('.bulk-user-cb:checked'));
  const bar = document.getElementById('bulkActionBar');
  const countEl = document.getElementById('bulkSelCount');
  if (bar) bar.classList.toggle('hidden', selected.length === 0);
  if (countEl) countEl.textContent = `${selected.length} selected`;
}

async function bulkAction(action) {
  const selected = Array.from(document.querySelectorAll('.bulk-user-cb:checked')).map(cb => cb.dataset.username);
  if (!selected.length) { showToast('No users selected', 'error'); return; }
  if (action === 'role') {
    const newRole = document.getElementById('bulkRoleSelect').value;
    if (!newRole) { showToast('Select a role first', 'error'); return; }
    if (!confirm(`Change role to "${newRole}" for ${selected.length} user(s)?`)) return;
    await Promise.all(selected.map(u => apiFetch(`/api/admin/users/${u}/role`, { method: 'POST', body: JSON.stringify({ role: newRole }) }).catch(()=>{})));
    showToast(`Role updated for ${selected.length} user(s)`, 'success');
  } else {
    const label = action === 'lock' ? 'Lock' : 'Unlock';
    if (!confirm(`${label} ${selected.length} user(s)?`)) return;
    await Promise.all(selected.map(u => apiFetch(`/api/admin/users/${u}/${action}`, { method: 'POST' }).catch(()=>{})));
    showToast(`${selected.length} user(s) ${action}ed`, 'success');
  }
  loadAdminUsers();
}

// ============================================================
// Feature 7 — System Configuration
// ============================================================
async function loadSystemConfig() {
  try {
    const d = await apiFetch('/api/admin/config');
    const container = document.getElementById('systemConfigList');
    if (!d.config || !d.config.length) { container.innerHTML = '<p class="text-xs text-gray-400">No config entries</p>'; return; }
    container.innerHTML = d.config.map(item => `
      <div class="flex items-center gap-3 border border-gray-100 rounded-lg p-3 bg-gray-50">
        <div class="flex-1">
          <p class="text-xs font-semibold text-gray-700">${item.key}</p>
          <p class="text-[10px] text-gray-400">${item.description}</p>
        </div>
        <input type="text" id="cfg_${item.key}" value="${item.value}" class="border border-gray-200 rounded px-2 py-1 text-xs w-28 text-center"/>
        <button onclick="saveConfigKey('${item.key}')" class="text-xs px-3 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition">Save</button>
      </div>
    `).join('');
  } catch(e) { console.error('Config error:', e); }
}

async function saveConfigKey(key) {
  const input = document.getElementById(`cfg_${key}`);
  if (!input) return;
  try {
    await apiFetch('/api/admin/config', { method: 'POST', body: JSON.stringify({ key, value: input.value }) });
    showToast(`Saved: ${key} = ${input.value}`, 'success');
  } catch(e) { showToast(e.message || 'Failed to save', 'error'); }
}

// ============================================================
// Feature 8 — Backup & Export
// ============================================================
function downloadDBBackup() {
  window.location.href = (typeof API !== 'undefined' ? API : '') + '/api/admin/backup/database?token=' + (localStorage.getItem('ipts_token') || '');
  // Note: since this uses window.location, we trigger via a fetch + blob instead for auth
  _downloadWithAuth('/api/admin/backup/database', 'ipts_backup.db');
}

function exportAuditCSV() {
  _downloadWithAuth('/api/admin/backup/audit-csv', 'audit_log.csv');
}

async function _downloadWithAuth(url, defaultFilename) {
  try {
    const resp = await fetch((typeof API !== 'undefined' ? API : '') + url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!resp.ok) { showToast('Download failed', 'error'); return; }
    const blob = await resp.blob();
    const disposition = resp.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename=([^\s;]+)/);
    const filename = match ? match[1] : defaultFilename;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  } catch(e) { showToast(e.message || 'Download error', 'error'); }
}

// Override downloadDBBackup to use auth fetch
function downloadDBBackup() { _downloadWithAuth('/api/admin/backup/database', 'ipts_backup.db'); }

// ============================================================
// Feature 9 — Announcement Banner (admin panel side)
// ============================================================
async function publishAnnouncement() {
  const msg = document.getElementById('announcementText').value.trim();
  if (!msg) { showToast('Enter a message first', 'error'); return; }
  try {
    await apiFetch('/api/admin/announcement', { method: 'POST', body: JSON.stringify({ message: msg, active: true }) });
    showToast('Announcement published', 'success');
  } catch(e) { showToast(e.message || 'Failed to publish', 'error'); }
}

async function clearAnnouncement() {
  try {
    await apiFetch('/api/admin/announcement', { method: 'POST', body: JSON.stringify({ message: '', active: false }) });
    document.getElementById('announcementText').value = '';
    showToast('Announcement cleared', 'success');
  } catch(e) { showToast(e.message || 'Failed to clear', 'error'); }
}

// ============================================================
// Feature 10 — Quick Corridor Controls
// ============================================================
async function loadAdminCorridors() {
  try {
    const d = await apiFetch('/api/corridors?status=all');
    const container = document.getElementById('adminCorridorList');
    const badge = document.getElementById('corridorSuspendedBadge');
    const corridors = d.corridors || [];
    const suspended = corridors.filter(c => c.status !== 'active').length;
    if (badge) {
      badge.textContent = `${suspended} suspended`;
      badge.classList.toggle('hidden', suspended === 0);
    }
    if (!corridors.length) { container.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">No corridors found</p>'; return; }
    container.innerHTML = corridors.map(c => {
      const isActive = c.status === 'active';
      return `<div class="flex items-center justify-between border border-gray-100 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition">
        <div>
          <p class="text-xs font-semibold text-gray-800">${c.source_flag||''} ${c.source_country} → ${c.dest_flag||''} ${c.dest_country}</p>
          <p class="text-[10px] text-gray-400">${c.name} &nbsp;·&nbsp; ${c.source_currency}/${c.dest_currency}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${isActive ? 'Active' : 'Suspended'}</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleAdminCorridor(${c.id}, this.checked)" class="sr-only peer">
            <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>`;
    }).join('');
  } catch(e) { console.error('Corridor controls error:', e); }
}

async function toggleAdminCorridor(id, active) {
  try {
    const d = await apiFetch(`/api/corridors/${id}/toggle`, { method: 'POST' });
    showToast(`Corridor ${d.new_status === 'active' ? 'activated' : 'suspended'}`, d.new_status === 'active' ? 'success' : 'warning');
    loadAdminCorridors();
  } catch(e) { showToast(e.message || 'Failed to toggle corridor', 'error'); loadAdminCorridors(); }
}
