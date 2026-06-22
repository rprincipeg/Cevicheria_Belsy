(function () {
  if (!window.CB || !CB.protectPage(['admin'])) return;

  var API_BASE = CB.CONFIG.API_BASE;

  var startDateInput = document.getElementById('startDateInput');
  var endDateInput   = document.getElementById('endDateInput');
  var searchBtn      = document.getElementById('searchHistoryBtn');
  var resetBtn       = document.getElementById('resetHistoryBtn');
  var exportBtn      = document.getElementById('exportHistoryBtn');
  var logoutBtn      = document.getElementById('logoutBtn');
  var statTotal      = document.getElementById('statTotalAmount');
  var statCount      = document.getElementById('statTotalPayments');
  var statAvg        = document.getElementById('statAvgPayment');
  var tableBody      = document.getElementById('paymentsTableBody');

  // ── Auth helper ───────────────────────────────────────────────────────────────

  function getToken() {
    return sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
  }

  // ── Fetch wrapper (handles 401 + object errors uniformly) ────────────────────

  async function apiReq(method, path, body) {
    var headers = { Authorization: 'Bearer ' + getToken() };
    var opts = { method: method, headers: headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    var response = await fetch(API_BASE + path, opts);
    var data = null;
    try { data = await response.json(); } catch (_) { data = null; }
    if (response.status === 401) {
      CB.clearAuthSession();
      window.location.href = '../Login/acceso-por-rol.html';
      return null;
    }
    if (!response.ok) {
      var message = data && (data.error || data.message);
      if (typeof message === 'object') message = 'Datos inválidos';
      throw new Error(typeof message === 'string' ? message : 'Error en la petición');
    }
    return data;
  }

  // ── Utilities ─────────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PE');
  }

  function formatTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  function formatMoney(amount) {
    return 'S/ ' + Number(amount || 0).toFixed(2);
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function renderEmpty(msg) {
    tableBody.innerHTML = '<tr><td class="px-6 py-4 text-on-surface-variant" colspan="4">' + escHtml(msg) + '</td></tr>';
    statTotal.textContent = '—';
    statCount.textContent = '—';
    statAvg.textContent   = '—';
  }

  function renderPayments(data) {
    statTotal.textContent = formatMoney(data.totalAmount);
    statCount.textContent = data.totalPayments;
    var avg = data.totalPayments > 0 ? data.totalAmount / data.totalPayments : 0;
    statAvg.textContent = formatMoney(avg);

    if (!data.payments || data.payments.length === 0) {
      tableBody.innerHTML = '<tr><td class="px-6 py-4 text-on-surface-variant" colspan="4">No hay pagos en el período seleccionado.</td></tr>';
      return;
    }

    tableBody.innerHTML = data.payments.map(function (p) {
      var mesa = p.isTakeaway ? 'Para llevar' : 'Mesa ' + (p.tableNumber || '?');
      return '<tr>' +
        '<td class="px-6 py-4">' + escHtml(mesa) + '</td>' +
        '<td class="px-6 py-4">' + escHtml(formatDate(p.createdAt)) + '</td>' +
        '<td class="px-6 py-4">' + escHtml(formatTime(p.createdAt)) + '</td>' +
        '<td class="px-6 py-4 font-label-lg">' + escHtml(formatMoney(p.amount)) + '</td>' +
        '</tr>';
    }).join('');
  }

  // ── Search ────────────────────────────────────────────────────────────────────

  async function search() {
    var start = startDateInput.value;
    var end   = endDateInput.value;
    if (!start || !end) {
      CB.alert('Selecciona una fecha de inicio y una fecha de fin.');
      return;
    }
    if (end < start) {
      CB.alert('La fecha fin debe ser mayor o igual al inicio.');
      return;
    }
    searchBtn.disabled = true;
    searchBtn.textContent = 'Buscando...';
    try {
      var data = await apiReq('GET', '/reports/payments?startDate=' + start + '&endDate=' + end);
      if (data !== null) renderPayments(data);
    } catch (err) {
      CB.alert(err.message || 'Error al cargar el historial.');
      renderEmpty('Error al cargar los pagos.');
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Buscar';
    }
  }

  function reset() {
    startDateInput.value = '';
    endDateInput.value   = '';
    renderEmpty('Selecciona un rango de fechas y presiona Buscar.');
  }

  // ── Export Excel (blob download — no apiReq) ──────────────────────────────────

  function exportExcel() {
    var start = startDateInput.value;
    var end   = endDateInput.value;
    if (!start || !end) {
      CB.alert('Selecciona una fecha de inicio y una fecha de fin antes de exportar.');
      return;
    }
    fetch(API_BASE + '/reports/payments/export?startDate=' + start + '&endDate=' + end, {
      headers: { Authorization: 'Bearer ' + getToken() },
    })
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo generar el Excel');
        return r.blob();
      })
      .then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'pagos_' + start + '_' + end + '.xlsx';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(function (err) { CB.alert(err.message); });
  }

  // ── Event listeners ───────────────────────────────────────────────────────────

  searchBtn.addEventListener('click', search);
  resetBtn.addEventListener('click', reset);
  exportBtn.addEventListener('click', exportExcel);
  if (logoutBtn) logoutBtn.addEventListener('click', function () { CB.logout(); });

  // ── Boot: load today's payments on open ───────────────────────────────────────
  var today = todayISO();
  startDateInput.value = today;
  endDateInput.value   = today;
  search();
})();
