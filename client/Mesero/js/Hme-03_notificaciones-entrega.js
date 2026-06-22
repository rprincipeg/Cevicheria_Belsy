(function () {
  if (!window.CB || !CB.protectPage(['mesero'])) return;

  var API_BASE  = CB.CONFIG.API_BASE;
  var readyList    = document.getElementById('ready-list');
  var pendingList  = document.getElementById('pending-list');
  var readyCount   = document.getElementById('ready-count');
  var pendingCount = document.getElementById('pending-count');
  var refreshBtn   = document.getElementById('refresh-btn');
  var logoutBtn    = document.getElementById('btn-logout');
  var banner       = document.getElementById('notify-banner');
  var bannerText   = document.getElementById('notify-text');
  var bannerClose  = document.getElementById('notify-close');

  var bannerTimer = null;

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function authHeader() {
    return { 'Authorization': 'Bearer ' + sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN) };
  }

  function showBanner(msg) {
    bannerText.textContent = msg;
    banner.classList.remove('hidden');
    banner.classList.add('flex');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }, 6000);
  }

  function orderLocation(order, item) {
    var hasTable = order.tableLabel || order.tableNumber; // mesa asociada al pedido
    var isTk = order.isTakeaway || (item && item.isTakeaway);
    // Sin mesa => para llevar puro
    if (!hasTable) return 'Para Llevar';
    // Con mesa => mostrar el número aunque sea "para llevar"
    return 'Mesa ' + (order.tableLabel || order.tableNumber) + (isTk ? ' · Para llevar' : '');
  }

  // ── Build item card ─────────────────────────────────────────────────────────

  function buildCard(order, item, isReady) {
    var div = document.createElement('div');
    div.className = isReady
      ? 'bg-surface-container-lowest rounded-xl border-2 border-secondary shadow-md p-gutter flex flex-col gap-3 relative'
      : 'bg-surface-container-low rounded-xl border border-outline-variant p-gutter flex flex-col gap-3';
    div.dataset.orderId = order.id;
    div.dataset.itemId = item.id;

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
      (order.notes ? '<p class="font-label-md text-label-md text-on-surface-variant italic">' + escHtml(order.notes) + '</p>' : '') +
      (isReady
        ? '<button class="w-full h-touch-target-min bg-secondary text-on-secondary rounded-lg font-label-lg flex items-center justify-center gap-2 deliver-btn" data-order-id="' + escHtml(order.id) + '" data-item-id="' + escHtml(item.id) + '">' +
          '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">room_service</span> Entregar</button>'
        : '');

    return div;
  }

  // ── Render lists ────────────────────────────────────────────────────────────

  function renderOrders(orders) {
    var ready   = []; // { order, item }
    var pending = [];

    orders.forEach(function (o) {
      (o.items || []).forEach(function (it) {
        if (it.status === 'DELIVERED' || it.status === 'CANCELLED') return;
        // Bebidas (no preparables) están listas para servir de inmediato
        var isReady = (it.isPreparable === false) || it.status === 'READY';
        if (isReady) ready.push({ order: o, item: it });
        else if (it.isPreparable !== false) pending.push({ order: o, item: it });
      });
    });

    readyCount.textContent   = ready.length;
    pendingCount.textContent = pending.length;

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

  // ── Load orders ───────────────────────────────────────────────────────────────

  async function loadOrders() {
    readyList.innerHTML   = '<p class="col-span-full text-on-surface-variant text-body-md">Cargando...</p>';
    pendingList.innerHTML = '<p class="col-span-full text-on-surface-variant text-body-md">Cargando...</p>';
    try {
      var r = await fetch(API_BASE + '/orders/active', { headers: authHeader() });
      if (r.status === 401) { CB.clearAuthSession(); window.location.href = '../Login/acceso-por-rol.html'; return; }
      var orders = await r.json();
      renderOrders(orders);
    } catch (e) {
      readyList.innerHTML  = '<p class="col-span-full text-error text-body-md">Error al cargar pedidos.</p>';
      pendingList.innerHTML = '';
    }
  }

  // ── Deliver item ──────────────────────────────────────────────────────────────

  async function deliverItem(orderId, itemId, btn) {
    btn.disabled = true;
    btn.textContent = 'Entregando...';
    try {
      var r = await fetch(API_BASE + '/orders/' + orderId + '/items/' + itemId + '/deliver', {
        method: 'PATCH',
        headers: authHeader(),
      });
      var data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al entregar ítem');
      var card = document.querySelector('[data-item-id="' + itemId + '"]');
      if (card) { card.style.opacity = '0.4'; setTimeout(function () { card.remove(); }, 400); }
      loadOrders();
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">room_service</span> Entregar';
      alert(err.message || 'Error al entregar el ítem');
    }
  }

  // ── Event delegation ──────────────────────────────────────────────────────────

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.deliver-btn');
    if (btn) deliverItem(btn.dataset.orderId, btn.dataset.itemId, btn);
  });

  refreshBtn.addEventListener('click', loadOrders);
  bannerClose.addEventListener('click', function () { banner.classList.add('hidden'); banner.classList.remove('flex'); });
  if (logoutBtn) logoutBtn.addEventListener('click', function () { CB.logout(); });

  // ── Socket ────────────────────────────────────────────────────────────────────

  if (CB.socket) {
    CB.joinRoom('waiters');
    // Tras reconectar, recargar la lista de entregas pendientes.
    CB.onReconnect(loadOrders);

    CB.socket.on('orders:ready', function (data) {
      var location = data.isTakeaway ? 'Para Llevar' : 'Mesa ' + (data.tableLabel || data.tableNumber);
      showBanner('¡Pedido listo para entregar! ' + location);
      loadOrders();
    });

    CB.socket.on('orders:itemReady', function (data) {
      var location = data.isTakeaway ? 'Para Llevar' : 'Mesa ' + (data.tableLabel || data.tableNumber);
      showBanner('Ítem listo: ' + data.quantity + 'x ' + data.itemName + ' (' + location + ')');
      loadOrders();
    });

    CB.socket.on('orders:itemDelivered', function (data) {
      var card = document.querySelector('[data-item-id="' + data.itemId + '"]');
      if (card) { card.style.opacity = '0.3'; setTimeout(function () { card.remove(); }, 400); }
      loadOrders();
    });

    CB.socket.on('orders:delivered', function () { loadOrders(); });

    CB.socket.on('orders:updated', function () { loadOrders(); });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────
  loadOrders();
})();
