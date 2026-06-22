(function () {
  if (!CB.protectPage(['mesero', 'admin'])) return;

  var sess = CB.getSession();
  var userLabel = document.getElementById('user-label');
  if (sess && userLabel) userLabel.textContent = sess.usuario || (sess.rol.charAt(0).toUpperCase() + sess.rol.slice(1));

  document.getElementById('btn-logout').addEventListener('click', function () { CB.logout(); });
  document.getElementById('btn-back').addEventListener('click', function () {
    window.location.href = '../Mesero/Hme-01_mapa-mesas.html';
  });

  // ---- URL params ----
  var params = new URLSearchParams(window.location.search);
  var tableId = params.get('tableId') ? parseInt(params.get('tableId'), 10) : null;
  var tableNumber = params.get('tableNumber');
  // Etiqueta de fusión ("1 + 2") si la mesa está fusionada; si no, el número simple.
  var tableLabel = params.get('tableLabel') || tableNumber;
  var existingOrderId = params.get('orderId') || null;
  var isTakeaway = params.get('isTakeaway') === 'true';

  var pageTitle = document.getElementById('page-title');
  var sidebarSubtitle = document.getElementById('sidebar-subtitle');
  if (isTakeaway) {
    pageTitle.textContent = 'Para Llevar — Tomar pedido';
    sidebarSubtitle.textContent = 'Para llevar';
  } else if (tableNumber) {
    pageTitle.textContent = 'Mesa ' + tableLabel + (existingOrderId ? ' — Añadir ítems' : ' — Tomar pedido');
    sidebarSubtitle.textContent = 'Mesa ' + tableLabel;
  }

  if (!isTakeaway && tableId) {
    document.getElementById('takeaway-toggle-wrap').classList.remove('hidden');
  }

  // ---- Pestañas móvil ----
  var tabCarta = document.getElementById('tab-carta');
  var tabPedido = document.getElementById('tab-pedido');
  var tabBadge = document.getElementById('tab-badge');
  var paneCarta = document.getElementById('pane-carta');
  var panePedido = document.getElementById('pane-pedido');

  function showTab(tab) {
    if (tab === 'carta') {
      paneCarta.classList.remove('mobile-hide');
      panePedido.classList.remove('mobile-show');
      tabCarta.className = 'flex-1 py-3 font-label-lg text-label-lg text-primary border-b-2 border-primary';
      tabPedido.className = 'flex-1 py-3 font-label-lg text-label-lg text-on-surface-variant border-b-2 border-transparent flex items-center justify-center gap-2';
    } else {
      paneCarta.classList.add('mobile-hide');
      panePedido.classList.add('mobile-show');
      tabPedido.className = 'flex-1 py-3 font-label-lg text-label-lg text-primary border-b-2 border-primary flex items-center justify-center gap-2';
      tabCarta.className = 'flex-1 py-3 font-label-lg text-label-lg text-on-surface-variant border-b-2 border-transparent';
    }
  }

  if (tabCarta) tabCarta.addEventListener('click', function () { showTab('carta'); });
  if (tabPedido) tabPedido.addEventListener('click', function () { showTab('pedido'); });

  function updateTabBadge(count) {
    if (!tabBadge) return;
    if (count > 0) { tabBadge.classList.remove('hidden'); tabBadge.textContent = count; }
    else { tabBadge.classList.add('hidden'); }
  }

  // ---- API helper ----
  function apiReq(method, path, body) {
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    var opts = { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } };
    if (body) opts.body = JSON.stringify(body);
    return fetch(CB.CONFIG.API_BASE + path, opts).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    });
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Categorías ----
  var categories = [];
  var activeCategoryId = null;

  function renderTabs() {
    var container = document.getElementById('category-tabs');
    container.innerHTML = '';
    categories.forEach(function (cat) {
      var btn = document.createElement('button');
      var isActive = cat.id === activeCategoryId;
      btn.className = 'flex flex-col items-center gap-1 px-4 py-3 border-b-2 ' +
        (isActive ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-t-lg') +
        ' transition-colors h-touch-target-min font-label-lg text-label-lg';
      btn.textContent = cat.name;
      btn.addEventListener('click', function () { activeCategoryId = cat.id; renderTabs(); renderItems(); });
      container.appendChild(btn);
    });
  }

  // ---- Carrito ----
  // Each entry = 1 unit: { cartId, menuItemId, name, price, isTakeaway }
  var cart = [];
  var nextCartId = 0;

  // Recargo S/ 1.00 por cada plato marcado "para llevar" (debe coincidir con el backend).
  var TAKEAWAY_SURCHARGE = 1;
  function entryUnitPrice(entry, globalTakeaway) {
    var togo = globalTakeaway || entry.isTakeaway;
    return entry.price + (togo ? TAKEAWAY_SURCHARGE : 0);
  }
  function cartTotal() {
    var g = getGlobalTakeaway();
    return cart.reduce(function (s, c) { return s + entryUnitPrice(c, g); }, 0);
  }
  function cartCount() { return cart.length; }

  function getGlobalTakeaway() {
    return isTakeaway || (document.getElementById('takeaway-toggle') ? document.getElementById('takeaway-toggle').checked : false);
  }

  function renderCart() {
    var container = document.getElementById('cart-items');
    var emptyMsg = document.getElementById('cart-empty');
    var confirmBtn = document.getElementById('btn-confirm');
    var countLabel = document.getElementById('cart-count-label');
    var subtotalEl = document.getElementById('cart-subtotal');
    var totalEl = document.getElementById('cart-total');
    var globalTakeaway = getGlobalTakeaway();

    Array.from(container.querySelectorAll('.cart-item')).forEach(function (el) { el.remove(); });

    if (cart.length === 0) {
      emptyMsg.classList.remove('hidden');
    } else {
      emptyMsg.classList.add('hidden');
      cart.forEach(function (entry) {
        var div = document.createElement('div');
        div.className = 'cart-item bg-surface-container-lowest p-3 rounded-xl border border-surface-variant shadow-sm flex flex-col gap-2';
        var effectiveTakeaway = globalTakeaway || entry.isTakeaway;
        var takeawayRow = '';
        if (!isTakeaway) {
          var toggleId = 'itogo-' + entry.cartId;
          takeawayRow =
            '<label class="flex items-center gap-2 cursor-pointer w-max">' +
              '<div class="relative">' +
                '<input id="' + toggleId + '" class="sr-only peer item-togo-check" type="checkbox" data-cart-id="' + entry.cartId + '"' + (effectiveTakeaway ? ' checked' : '') + '>' +
                '<div class="w-10 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>' +
              '</div>' +
              '<span class="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">' +
                '<span class="material-symbols-outlined text-[16px]">takeout_dining</span>Para llevar' +
              '</span>' +
            '</label>';
        }
        div.innerHTML =
          '<div class="flex justify-between items-center gap-2">' +
            '<span class="font-label-lg text-label-lg text-on-surface truncate flex-1">' + escHtml(entry.name) + '</span>' +
            '<div class="flex items-center gap-2 shrink-0">' +
              '<span class="font-headline-md text-headline-md text-on-surface text-base">S/ ' + entryUnitPrice(entry, globalTakeaway).toFixed(2) + (effectiveTakeaway ? '<span class="font-label-md text-label-md text-on-surface-variant"> (+1 llevar)</span>' : '') + '</span>' +
              '<button class="h-8 w-8 rounded-full flex items-center justify-center text-error hover:bg-error-container transition-colors" data-remove-cart="' + entry.cartId + '">' +
                '<span class="material-symbols-outlined text-[18px]">delete</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
          takeawayRow;
        container.appendChild(div);
      });

      container.querySelectorAll('[data-remove-cart]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          removeFromCart(parseInt(btn.getAttribute('data-remove-cart'), 10));
        });
      });
      if (!isTakeaway) {
        container.querySelectorAll('.item-togo-check').forEach(function (chk) {
          chk.addEventListener('change', function () {
            var cid = parseInt(chk.dataset.cartId, 10);
            var entry = cart.find(function (c) { return c.cartId === cid; });
            if (entry) {
              entry.isTakeaway = chk.checked;
              var toggle = document.getElementById('takeaway-toggle');
              if (toggle) {
                toggle.checked = chk.checked && cart.every(function (c) { return c.isTakeaway; });
                if (!chk.checked) toggle.checked = false;
              }
              renderCart(); // refrescar precios/total con el recargo "para llevar"
            }
          });
        });
      }
    }

    var total = cartTotal();
    var count = cartCount();
    countLabel.textContent = count + (count === 1 ? ' ítem' : ' ítems');
    subtotalEl.textContent = 'S/ ' + total.toFixed(2);
    totalEl.textContent = 'S/ ' + total.toFixed(2);
    confirmBtn.disabled = cart.length === 0;
    confirmBtn.classList.toggle('opacity-50', cart.length === 0);
    confirmBtn.classList.toggle('cursor-not-allowed', cart.length === 0);
    updateTabBadge(count);
  }

  function addToCart(item) {
    if (item.stockStatus === 'OUT_OF_STOCK') return;
    cart.push({ cartId: nextCartId++, menuItemId: item.id, name: item.name, price: Number(item.price), isTakeaway: getGlobalTakeaway() });
    renderCart();
    renderItems();
  }

  function removeFromCart(cartId) {
    cart = cart.filter(function (c) { return c.cartId !== cartId; });
    renderCart();
    renderItems();
  }

  // delta=-1: remove the last unit of this type; delta=+1: handled by addToCart directly
  function changeQty(menuItemId, delta) {
    if (delta < 0) {
      var lastIdx = -1;
      for (var i = cart.length - 1; i >= 0; i--) {
        if (cart[i].menuItemId === menuItemId) { lastIdx = i; break; }
      }
      if (lastIdx >= 0) { cart.splice(lastIdx, 1); renderCart(); renderItems(); }
    }
  }

  // ---- Ítems del menú ----
  function renderItems() {
    var cat = categories.find(function (c) { return c.id === activeCategoryId; });
    var grid = document.getElementById('menu-grid');
    grid.innerHTML = '';
    if (!cat) return;
    cat.items.forEach(function (item) {
      var isAvailable = item.stockStatus !== 'OUT_OF_STOCK';
      var qtyInCart = cart.filter(function (c) { return c.menuItemId === item.id; }).length;
      var card = document.createElement('div');
      card.className = 'bg-surface rounded-xl shadow-sm border border-surface-variant overflow-hidden flex flex-col';
      card.innerHTML =
        '<div class="h-36 md:h-40 w-full relative bg-surface-container-high">' +
          (item.imageUrl
            ? '<img alt="' + escHtml(item.name) + '" class="w-full h-full object-cover" src="' + escHtml(CB.assetUrl(item.imageUrl)) + '">'
            : '<div class="w-full h-full flex items-center justify-center text-outline-variant"><span class="material-symbols-outlined text-4xl">restaurant</span></div>') +
          '<div class="absolute top-2 right-2 ' + (isAvailable ? 'bg-secondary text-on-secondary' : 'bg-error text-on-error') + ' px-3 py-1 rounded-full font-label-md text-label-md shadow-sm">' + (isAvailable ? 'Disponible' : 'Agotado') + '</div>' +
        '</div>' +
        '<div class="p-4 flex flex-col flex-1">' +
          '<div class="flex justify-between items-start mb-2">' +
            '<h3 class="font-label-lg text-label-lg text-on-surface leading-tight">' + escHtml(item.name) + '</h3>' +
            '<span class="font-label-lg text-label-lg text-primary shrink-0 ml-2">S/ ' + Number(item.price).toFixed(2) + '</span>' +
          '</div>' +
          (item.description ? '<p class="font-label-md text-label-md text-on-surface-variant mb-3 flex-1">' + escHtml(item.description) + '</p>' : '<div class="flex-1 mb-3"></div>') +
          '<div class="flex items-center justify-between mt-auto">' +
            '<button class="h-touch-target-min w-touch-target-min rounded-lg ' + (qtyInCart > 0 ? 'bg-surface-container-high text-on-surface hover:bg-surface-variant' : 'bg-surface-container text-outline-variant opacity-50 cursor-not-allowed') + ' flex items-center justify-center transition-colors" ' + (qtyInCart === 0 ? 'disabled' : '') + ' data-dec-item="' + escHtml(item.id) + '">' +
              '<span class="material-symbols-outlined">remove</span>' +
            '</button>' +
            '<span class="font-headline-md text-headline-md w-8 text-center ' + (qtyInCart > 0 ? 'text-on-surface' : 'text-on-surface-variant') + '">' + qtyInCart + '</span>' +
            '<button class="h-touch-target-min w-touch-target-min rounded-lg ' + (isAvailable ? 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-sm' : 'bg-surface-container text-outline-variant cursor-not-allowed opacity-60') + ' flex items-center justify-center transition-colors shadow-sm" ' + (isAvailable ? '' : 'disabled') + ' data-add-item="' + escHtml(item.id) + '">' +
              '<span class="material-symbols-outlined">add</span>' +
            '</button>' +
          '</div>' +
        '</div>';
      card.querySelector('[data-add-item]').addEventListener('click', function () { addToCart(item); });
      var decBtn = card.querySelector('[data-dec-item]');
      if (decBtn && !decBtn.disabled) decBtn.addEventListener('click', function () { changeQty(item.id, -1); });
      grid.appendChild(card);
    });
  }

  // ---- Carga de categorías ----
  function loadCategories() {
    apiReq('GET', '/menu/categories').then(function (res) {
      if (!res.ok) { CB.debug('Error cargando carta:', res.data); return; }
      categories = res.data;
      if (categories.length > 0) activeCategoryId = categories[0].id;
      renderTabs();
      renderItems();
    }).catch(function (err) { CB.debug('Error de red:', err); });
  }

  loadCategories();

  var takeawayToggle = document.getElementById('takeaway-toggle');
  if (takeawayToggle) {
    takeawayToggle.addEventListener('change', function () {
      var checked = this.checked;
      cart.forEach(function (entry) { entry.isTakeaway = checked; });
      renderCart();
    });
  }

  // ---- Ítems del pedido existente (mesa ocupada) ----
  function renderExistingItems(items) {
    var section = document.getElementById('existing-section');
    var list = document.getElementById('existing-items-list');
    if (!items || items.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    list.innerHTML = '';
    items.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'flex items-center gap-1.5 py-1';
      div.innerHTML =
        '<span class="font-label-lg text-label-lg text-on-surface truncate flex-1">' + escHtml(item.menuItem.name) + '</span>' +
        '<span class="font-label-md text-label-md text-on-surface-variant shrink-0">×' + item.quantity + '</span>';
      list.appendChild(div);
    });
    var emptyMsg = document.getElementById('cart-empty');
    if (emptyMsg) emptyMsg.innerHTML =
      '<span class="material-symbols-outlined text-4xl block mb-2">add_shopping_cart</span>Selecciona ítems para añadir al pedido';
  }

  // Load ALL active items for the table (covers merged orders too)
  function loadTableActiveItems() {
    if (tableId) {
      apiReq('GET', '/tables/' + tableId + '/active-items').then(function (res) {
        if (!res.ok) { CB.debug('Error cargando ítems de mesa:', res.data); return; }
        renderExistingItems(res.data.items || []);
      }).catch(function (err) { CB.debug('Error al cargar ítems:', err); });
    } else if (existingOrderId) {
      apiReq('GET', '/orders/' + existingOrderId).then(function (res) {
        if (!res.ok) { CB.debug('Error cargando pedido existente:', res.data); return; }
        renderExistingItems(res.data.items || []);
      }).catch(function (err) { CB.debug('Error al cargar pedido:', err); });
    }
  }

  loadTableActiveItems();

  if (CB.socket) {
    CB.joinRoom('waiters');
    CB.socket.on('menu:updated', function () {
      loadCategories();
    });
    if (tableId || existingOrderId) {
      CB.socket.on('orders:updated', function () { loadTableActiveItems(); });
    }
    // Tras reconectar, recargar carta e ítems activos de la mesa.
    CB.onReconnect(function () {
      loadCategories();
      if (tableId || existingOrderId) loadTableActiveItems();
    });
  }

  // ---- Confirmar pedido ----
  document.getElementById('btn-confirm').addEventListener('click', function () {
    if (cart.length === 0) return;
    var globalTakeaway = getGlobalTakeaway();
    var items = cart.map(function (c) {
      return { menuItemId: c.menuItemId, quantity: 1, isTakeaway: globalTakeaway || c.isTakeaway };
    });
    var notes = document.getElementById('order-notes').value.trim() || undefined;

    var req;
    if (existingOrderId) {
      var addBody = { items: items };
      if (notes) addBody.notes = notes;
      req = apiReq('POST', '/orders/' + existingOrderId + '/items', addBody);
    } else {
      var body = { isTakeaway: globalTakeaway, items: items };
      if (notes) body.notes = notes;
      if (tableId !== null) body.tableId = tableId;
      req = apiReq('POST', '/orders', body);
    }

    var btn = document.getElementById('btn-confirm');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Enviando...';

    req.then(function (res) {
      if (!res.ok) {
        alert('Error: ' + (res.data.error || 'No se pudo confirmar el pedido'));
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">send</span> Confirmar pedido';
        return;
      }
      window.location.href = '../Mesero/Hme-01_mapa-mesas.html';
    }).catch(function () {
      alert('Error de conexión. Inténtalo de nuevo.');
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">send</span> Confirmar pedido';
    });
  });
})();
