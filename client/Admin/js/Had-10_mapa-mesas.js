(function () {
  if (!window.CB || !CB.protectPage(['admin'])) return;

  document.getElementById('logoutBtn').addEventListener('click', function () { CB.logout(); });

  function getToken() {
    return sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
  }

  function authHeader() {
    return { 'Authorization': 'Bearer ' + getToken() };
  }

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  var tabMapa      = document.getElementById('tab-mapa');
  var tabEntregas  = document.getElementById('tab-entregas');
  var panelMapa    = document.getElementById('panel-mapa');
  var panelEntregas = document.getElementById('panel-entregas');

  var ACTIVE_TAB   = 'border-b-2 border-primary text-primary';
  var INACTIVE_TAB = 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface';

  function showTab(tab) {
    if (tab === 'mapa') {
      tabMapa.className     = 'font-label-lg text-label-lg px-5 py-3 transition-colors ' + ACTIVE_TAB;
      tabEntregas.className = 'font-label-lg text-label-lg px-5 py-3 transition-colors ' + INACTIVE_TAB;
      panelMapa.classList.remove('hidden');
      panelEntregas.classList.add('hidden');
    } else {
      tabEntregas.className = 'font-label-lg text-label-lg px-5 py-3 transition-colors ' + ACTIVE_TAB;
      tabMapa.className     = 'font-label-lg text-label-lg px-5 py-3 transition-colors ' + INACTIVE_TAB;
      panelEntregas.classList.remove('hidden');
      panelMapa.classList.add('hidden');
      loadOrders();
    }
  }

  tabMapa.addEventListener('click', function () { showTab('mapa'); });
  tabEntregas.addEventListener('click', function () { showTab('entregas'); });

  // ── Mapa de Mesas ─────────────────────────────────────────────────────────────

  function renderTables(tableData) {
    if (!Array.isArray(tableData)) {
      document.getElementById('tables-loading').textContent = 'Error al cargar mesas.';
      return;
    }
    var loading        = document.getElementById('tables-loading');
    var grid           = document.getElementById('tables-grid');
    var divider        = document.getElementById('section-divider');
    var takeawaySection = document.getElementById('takeaway-section');

    loading.classList.add('hidden');
    grid.innerHTML = '';

    var realTables = tableData.filter(function (t) { return t.id !== 'takeaway'; });
    var hasTakeaway = tableData.some(function (t) { return t.id === 'takeaway'; });

    if (realTables.length > 0) {
      grid.classList.remove('hidden');
      realTables.forEach(function (table) {
        var isFree = table.status === 'FREE';
        var card = document.createElement('div');
        if (isFree) {
          card.className = 'w-full max-w-[220px] aspect-square bg-surface-container-lowest rounded-xl shadow-sm flex flex-col items-center justify-center p-4 relative';
          card.innerHTML =
            '<span class="material-symbols-outlined absolute top-4 right-4 text-outline">table_restaurant</span>' +
            '<span class="font-display-lg text-display-lg text-on-surface mb-3">' + table.number + '</span>' +
            '<div class="bg-[#86efac] text-[#14532d] px-4 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wide">Libre</div>';
        } else {
          card.className = 'w-full max-w-[220px] aspect-square bg-tertiary-fixed rounded-xl shadow-md flex flex-col items-center justify-center p-4 relative transform scale-[1.02] ring-2 ring-tertiary-fixed-dim';
          card.innerHTML =
            '<span class="material-symbols-outlined absolute top-4 right-4 text-on-tertiary-fixed-variant" style="font-variation-settings:\'FILL\' 1;">table_restaurant</span>' +
            '<span class="font-display-lg text-display-lg text-on-tertiary-fixed-variant mb-3">' + table.number + '</span>' +
            '<div class="bg-tertiary text-on-tertiary px-4 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wide shadow-sm">Ocupada</div>';
        }
        grid.appendChild(card);
      });
    }

    if (hasTakeaway) {
      divider.classList.remove('hidden');
      takeawaySection.classList.remove('hidden');
    } else {
      divider.classList.add('hidden');
      takeawaySection.classList.add('hidden');
    }
  }

  function loadTables() {
    fetch(CB.CONFIG.API_BASE + '/tables', { headers: authHeader() })
      .then(function (r) { return r.json(); })
      .then(renderTables)
      .catch(function () {
        document.getElementById('tables-loading').textContent = 'Error al cargar mesas.';
      });
  }

  // ── Entregas ──────────────────────────────────────────────────────────────────

  function orderLocation(order, item) {
    var takeaway = order.isTakeaway || (item && item.isTakeaway);
    return takeaway ? 'Para Llevar' : 'Mesa ' + order.tableNumber;
  }

  function buildCard(order, item, isReady) {
    var div = document.createElement('div');
    div.className = isReady
      ? 'bg-surface-container-lowest rounded-xl border-2 border-secondary shadow-md p-gutter flex flex-col gap-3'
      : 'bg-surface-container-low rounded-xl border border-outline-variant p-gutter flex flex-col gap-3';

    var location = orderLocation(order, item);
    var statusHtml = isReady
      ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-md text-label-md">' +
        '<span class="material-symbols-outlined text-[14px]" style="font-variation-settings:\'FILL\' 1">check_circle</span> Listo</span>'
      : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md">' +
        '<span class="material-symbols-outlined text-[14px]">pending</span> En preparación</span>';

    div.innerHTML =
      '<div class="flex items-start justify-between gap-2">' +
        '<div>' +
          '<p class="font-headline-md text-headline-md text-on-surface">' + escHtml(location) + '</p>' +
          '<p class="font-label-md text-label-md text-on-surface-variant">' + escHtml(order.code) + '</p>' +
        '</div>' +
        statusHtml +
      '</div>' +
      '<p class="font-label-lg text-label-lg text-on-surface flex items-center gap-2">' +
        '<span class="material-symbols-outlined text-[16px] text-primary">fiber_manual_record</span>' +
        escHtml(item.quantity + 'x ' + item.name) + '</p>' +
      (order.notes ? '<p class="font-label-md text-label-md text-on-surface-variant italic">' + escHtml(order.notes) + '</p>' : '');

    return div;
  }

  function renderOrders(orders) {
    var readyList    = document.getElementById('ready-list');
    var pendingList  = document.getElementById('pending-list');
    var readyCount   = document.getElementById('ready-count');
    var pendingCount = document.getElementById('pending-count');
    var badge        = document.getElementById('entregas-badge');

    var ready   = [];
    var pending = [];

    orders.forEach(function (o) {
      (o.items || []).forEach(function (it) {
        if (it.status === 'DELIVERED' || it.status === 'CANCELLED') return;
        var isReady = (it.isPreparable === false) || it.status === 'READY';
        if (isReady) ready.push({ order: o, item: it });
        else if (it.isPreparable !== false) pending.push({ order: o, item: it });
      });
    });

    readyCount.textContent   = ready.length;
    pendingCount.textContent = pending.length;

    if (ready.length > 0) {
      badge.textContent = ready.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    if (ready.length === 0) {
      readyList.innerHTML = '<p class="col-span-full text-on-surface-variant text-body-md">Sin ítems listos para entregar.</p>';
    } else {
      readyList.innerHTML = '';
      ready.forEach(function (r) { readyList.appendChild(buildCard(r.order, r.item, true)); });
    }

    if (pending.length === 0) {
      pendingList.innerHTML = '<p class="col-span-full text-on-surface-variant text-body-md">Sin ítems en preparación.</p>';
    } else {
      pendingList.innerHTML = '';
      pending.forEach(function (p) { pendingList.appendChild(buildCard(p.order, p.item, false)); });
    }
  }

  function loadOrders() {
    var readyList   = document.getElementById('ready-list');
    var pendingList = document.getElementById('pending-list');
    readyList.innerHTML   = '<p class="col-span-full text-on-surface-variant text-body-md">Cargando...</p>';
    pendingList.innerHTML = '<p class="col-span-full text-on-surface-variant text-body-md">Cargando...</p>';
    fetch(CB.CONFIG.API_BASE + '/orders/active', { headers: authHeader() })
      .then(function (r) {
        if (r.status === 401) { CB.clearAuthSession(); window.location.href = '../Login/acceso-por-rol.html'; return null; }
        return r.json();
      })
      .then(function (orders) { if (orders) renderOrders(orders); })
      .catch(function () {
        document.getElementById('ready-list').innerHTML = '<p class="col-span-full text-error text-body-md">Error al cargar pedidos.</p>';
      });
  }

  // ── Socket ────────────────────────────────────────────────────────────────────

  if (CB.socket) {
    CB.joinRoom('waiters');
    CB.socket.on('tables:updated', function (data) { renderTables(data); });
    CB.socket.on('orders:ready',       function () { loadOrders(); });
    CB.socket.on('orders:itemReady',   function () { loadOrders(); });
    CB.socket.on('orders:itemDelivered', function () { loadOrders(); });
    CB.socket.on('orders:delivered',   function () { loadOrders(); });
    CB.socket.on('orders:updated',     function () { loadOrders(); });
    // Tras reconectar, recargar mesas y pedidos.
    CB.onReconnect(function () { loadTables(); loadOrders(); });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────

  loadTables();
  loadOrders();
})();
