(function () {
  if (!window.CB || !CB.protectPage(['admin'])) return;

  var API_BASE = CB.CONFIG.API_BASE;

  var statTotalSales   = document.getElementById('stat-total-sales');
  var statTablesSrv    = document.getElementById('stat-tables-served');
  var statTotalOrders  = document.getElementById('stat-total-orders');
  var reportRowCount   = document.getElementById('report-row-count');
  var detailChips      = document.getElementById('detail-chips');
  var detailCategories = document.getElementById('detail-categories');
  var exportBtn        = document.getElementById('exportReportBtn');
  var closeCashBtn     = document.getElementById('closeCashBtn');
  var logoutBtn        = document.getElementById('logoutBtn');

  var currentDate = null;

  // ── Auth helper ───────────────────────────────────────────────────────────

  function getToken() {
    return sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
  }

  // ── Fetch wrapper ─────────────────────────────────────────────────────────

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

  // ── Utilities ─────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ── Load report ───────────────────────────────────────────────────────────

  async function loadReport(date) {
    detailChips.hidden         = true;
    detailCategories.innerHTML = '<p class="text-on-surface-variant font-body-md text-body-md">Cargando...</p>';
    statTotalSales.textContent  = '—';
    statTablesSrv.textContent   = '—';
    statTotalOrders.textContent = '—';
    reportRowCount.textContent  = '—';
    try {
      var data = await apiReq('GET', '/reports/daily' + (date ? '?date=' + date : ''));
      if (data === null) return;
      currentDate = data.date || date || todayISO();
      renderReport(data);
    } catch (e) {
      detailCategories.innerHTML = '<p class="text-error font-body-md text-body-md">Error al cargar el reporte.</p>';
    }
  }

  // ── Render report ─────────────────────────────────────────────────────────

  function renderReport(data) {
    statTotalSales.textContent  = 'S/ ' + Number(data.totalSales || 0).toFixed(2);
    statTablesSrv.textContent   = data.tablesServed;
    statTotalOrders.textContent = data.totalOrders;

    detailChips.hidden = true;

    var details = data.details;

    if (!details) {
      reportRowCount.textContent   = '—';
      detailCategories.innerHTML   = '<p class="text-on-surface-variant font-body-md text-body-md">Sin detalle disponible.</p>';
      return;
    }

    var totalItems = (details.itemsByCategory || []).reduce(function (s, cat) {
      return s + cat.items.reduce(function (cs, i) { return cs + i.qty; }, 0);
    }, 0);
    reportRowCount.textContent = totalItems + ' ítems vendidos';

    // ── Items por categoría ───────────────────────────────────────────────────
    if (!details.itemsByCategory || details.itemsByCategory.length === 0) {
      detailCategories.innerHTML = '<p class="text-on-surface-variant font-body-md text-body-md">No hay ítems vendidos en este día.</p>';
      return;
    }

    detailCategories.innerHTML = details.itemsByCategory.map(function (cat) {
      var maxQty = cat.items.reduce(function (m, item) { return Math.max(m, item.qty); }, 1);
      var itemsHtml = cat.items.map(function (item) {
        var barPct = Math.round((item.qty / maxQty) * 100);
        return '<div class="flex items-center gap-3 py-2">' +
          '<span class="w-44 font-body-md text-on-surface truncate" title="' + escHtml(item.name) + '">' + escHtml(item.name) + '</span>' +
          '<div class="flex-1 bg-surface-container rounded-full h-2 min-w-[48px]">' +
            '<div class="bg-primary h-2 rounded-full" style="width:' + barPct + '%"></div>' +
          '</div>' +
          '<span class="w-16 text-right font-label-md text-label-md text-on-surface-variant shrink-0">' + item.qty + ' und.</span>' +
          '<span class="w-24 text-right font-label-lg text-label-lg text-secondary shrink-0">S/ ' + Number(item.revenue).toFixed(2) + '</span>' +
          '</div>';
      }).join('');
      return '<div>' +
        '<p class="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-2">' + escHtml(cat.categoryName) + '</p>' +
        '<div>' + itemsHtml + '</div>' +
        '</div>';
    }).join('');
  }

  // ── Descargar un blob Excel desde un endpoint autenticado ────────────────

  function downloadExcel(path, filename) {
    return fetch(API_BASE + path, {
      headers: { Authorization: 'Bearer ' + getToken() },
    })
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo generar el Excel');
        return r.blob();
      })
      .then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }

  function exportExcel() {
    var date = currentDate || todayISO();
    downloadExcel('/reports/daily/export?date=' + date, 'reporte_' + date + '.xlsx')
      .catch(function (err) { CB.alert(err.message); });
  }

  // ── Daily closure ─────────────────────────────────────────────────────────
  // NOTA: el límite de "un cierre por día" está temporalmente deshabilitado para
  // permitir múltiples cierres durante las pruebas.

  async function closeCash() {
    if (!(await CB.confirm('¿Seguro que deseas ejecutar el cierre de caja de hoy? Esta acción no se puede deshacer.', { confirmLabel: 'Cerrar caja', icon: 'point_of_sale' }))) return;
    closeCashBtn.disabled = true;
    closeCashBtn.textContent = 'Cerrando...';
    try {
      var data = await apiReq('POST', '/reports/daily/close');
      if (data === null) return;
      // Descargar el mismo Excel que genera "Exportar datos" (archivado en el cierre).
      try {
        await downloadExcel(
          '/reports/closures/' + data.closure.id + '/export',
          'cierre_' + (data.closure.date || todayISO()) + '.xlsx'
        );
      } catch (dlErr) {
        CB.debug && CB.debug('No se pudo descargar el Excel del cierre:', dlErr);
      }
      CB.alert('Cierre de caja ejecutado correctamente.\nTotal vendido: S/ ' + Number(data.closure.totalSales).toFixed(2));
      loadReport(todayISO());
    } catch (err) {
      CB.alert(err.message || 'Error al cerrar caja.');
    } finally {
      closeCashBtn.disabled = false;
      closeCashBtn.textContent = 'Cerrar caja';
    }
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  if (exportBtn)    exportBtn.addEventListener('click', exportExcel);
  if (closeCashBtn) closeCashBtn.addEventListener('click', closeCash);
  if (logoutBtn)    logoutBtn.addEventListener('click', function () { CB.logout(); });

  // ── Boot ──────────────────────────────────────────────────────────────────
  loadReport(todayISO());
})();
