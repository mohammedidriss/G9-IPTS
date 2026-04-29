// tab-documents.js — Documents module for IPTS

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

// Alias used in some places
function downloadDocument(id) { downloadDoc(id); }

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

function initStatementMonthPicker() {
  const sel = document.getElementById('statementMonth');
  if (!sel) return;
  sel.innerHTML = '';
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    sel.innerHTML += `<option value="${val}">${label}</option>`;
  }
}

async function downloadStatement() {
  const month = document.getElementById('statementMonth')?.value;
  if (!month) return;
  const url = `/api/accounts/statement?month=${month}&format=pdf&token=${TOKEN}`;
  const a = document.createElement('a');
  a.href = url; a.download = `IPTS_Statement_${month}.pdf`;
  a.click();
}
