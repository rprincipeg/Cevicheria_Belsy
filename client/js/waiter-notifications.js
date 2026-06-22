/* Notificaciones globales para mesero — muestra un toast en cualquier pantalla
   cuando el cocinero marca un pedido como listo.
   Se omite en Hme-03 (esa página ya tiene su propio banner). */
(function () {
  function init() {
    var session = window.CB && CB.getSession && CB.getSession();
    if (!session || session.rol !== 'mesero') return;
    if (window.location.pathname.toLowerCase().indexOf('hme-03') !== -1) return;
    if (!CB.socket) { CB.debug && CB.debug('waiter-notifications: socket no disponible'); return; }

    /* ── Estilos de animación ──────────────────────────────────────── */
    var style = document.createElement('style');
    style.textContent =
      '@keyframes cb-toast-in{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}' +
      '#cb-order-toast{display:none;position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:9999;' +
      'background:#006a61;color:#fff;border-radius:12px;padding:14px 20px;' +
      'box-shadow:0 4px 24px rgba(0,0,0,0.22);align-items:center;gap:12px;' +
      'min-width:280px;max-width:90vw;animation:cb-toast-in 0.3s ease;}' +
      '#cb-order-toast.show{display:flex;}';
    document.head.appendChild(style);

    /* ── Elemento toast ────────────────────────────────────────────── */
    var toast = document.createElement('div');
    toast.id = 'cb-order-toast';
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
      '<span class="material-symbols-outlined" ' +
        'style="font-variation-settings:\'FILL\' 1;font-size:22px;flex-shrink:0;">' +
        'notifications_active</span>' +
      '<span id="cb-toast-msg" style="flex:1;font-size:14px;font-weight:600;line-height:1.4;"></span>' +
      '<a id="cb-toast-link" href="Hme-03_notificaciones-entrega.html" ' +
        'style="font-size:12px;font-weight:700;text-decoration:underline;white-space:nowrap;color:inherit;opacity:0.9;">' +
        'Ver entregas</a>' +
      '<button id="cb-toast-close" aria-label="Cerrar" ' +
        'style="background:none;border:none;cursor:pointer;padding:0 0 0 6px;' +
        'font-size:24px;line-height:1;color:inherit;opacity:0.7;flex-shrink:0;">' +
        '&times;</button>';
    document.body.appendChild(toast);

    /* ── Lógica del toast ──────────────────────────────────────────── */
    var toastTimer = null;

    function showToast(msg) {
      var msgEl = document.getElementById('cb-toast-msg');
      if (msgEl) msgEl.textContent = msg;
      /* Reinicia la animación forzando reflow */
      toast.classList.remove('show');
      void toast.offsetWidth;
      toast.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(hideToast, 6000);
    }

    function hideToast() {
      toast.classList.remove('show');
    }

    document.getElementById('cb-toast-close').addEventListener('click', hideToast);

    /* ── Badge contador en el botón "Entregas" (solo Mapa de Mesas) ── */
    var badge = null;

    function authHeader() {
      return { 'Authorization': 'Bearer ' + sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN) };
    }

    function setupBadge() {
      var btn = document.getElementById('btn-notifications');
      if (!btn) return; /* solo existe en Hme-01 (Mapa de Mesas) */
      var anchor = btn.querySelector('.material-symbols-outlined') || btn;
      anchor.style.position = 'relative';
      badge = document.createElement('span');
      badge.id = 'cb-notif-badge';
      badge.style.cssText =
        'display:none;position:absolute;top:-8px;right:-10px;' +
        'min-width:18px;height:18px;padding:0 4px;box-sizing:border-box;' +
        'background:#ba1a1a;color:#fff;border-radius:9999px;' +
        'font-size:11px;font-weight:700;line-height:1;' +
        'align-items:center;justify-content:center;' +
        'box-shadow:0 0 0 2px #f6fafe;';
      anchor.appendChild(badge);
    }

    function refreshBadge() {
      if (!badge) return;
      fetch(CB.CONFIG.API_BASE + '/orders/active', { headers: authHeader() })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (orders) {
          /* Cuenta cada ítem listo (READY) pendiente de entregar */
          var count = 0;
          orders.forEach(function (o) {
            (o.items || []).forEach(function (it) {
              if (it.status === 'READY') count++;
            });
          });
          if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = 'flex';
          } else {
            badge.style.display = 'none';
          }
        })
        .catch(function () {});
    }

    setupBadge();
    refreshBadge();

    /* ── Socket: unirse al room y escuchar eventos ─────────────────── */
    CB.socket.on('orders:ready', function (data) {
      var location = data.isTakeaway ? 'Para Llevar' : 'Mesa ' + (data.tableLabel || data.tableNumber);
      showToast('¡Pedido listo para entregar! ' + location);
      refreshBadge();
    });

    /* Notificación por cada ítem individual marcado como listo */
    CB.socket.on('orders:itemReady', function (data) {
      var location = data.isTakeaway ? 'Para Llevar' : 'Mesa ' + (data.tableLabel || data.tableNumber);
      showToast('Ítem listo: ' + data.quantity + 'x ' + data.itemName + ' — ' + location);
      refreshBadge();
    });

    /* Un pedido o ítem entregado (por este u otro mesero) reduce el contador */
    CB.socket.on('orders:delivered', refreshBadge);
    CB.socket.on('orders:itemDelivered', refreshBadge);
    CB.socket.on('orders:updated', refreshBadge);

    /* Unirse al room ahora y re-unirse automáticamente en cada reconexión.
       Tras reconectar, refrescar el contador por si cambió mientras no había red. */
    CB.joinRoom('waiters');
    CB.onReconnect(refreshBadge);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
