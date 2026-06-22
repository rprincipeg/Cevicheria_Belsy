(function () {
  if (!window.CB || !CB.protectPage(['admin'])) return;

  document.getElementById('logoutBtn').addEventListener('click', function () { CB.logout(); });

  function getToken() {
    return sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
  }

  function apiReq(method, path) {
    return fetch(CB.CONFIG.API_BASE + path, {
      method: method,
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    });
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function elapsedLabel(isoDate) {
    var diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
    if (diff < 1) return 'Hace menos de 1 min';
    if (diff === 1) return 'Hace 1 min';
    return 'Hace ' + diff + ' min';
  }

  function timeLabel(isoDate) {
    var d = new Date(isoDate);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }


  var orders = [];

  function renderOrder(order, colType) {
    var isPending = colType === 'pending';
    var isInProgress = colType === 'inprogress';
    var isReady = colType === 'ready';

    var headerClass = isPending ? 'text-primary' : isInProgress ? 'text-tertiary' : 'text-secondary';
    var elapsed = elapsedLabel(order.createdAt);
    var elapsedClass = (Date.now() - new Date(order.createdAt).getTime() > 10 * 60000) ? 'text-error font-bold animate-pulse' : 'text-on-surface-variant';

    var locNum = order.tableLabel || (order.tableNumber != null ? String(order.tableNumber) : '?');
    var isCombinedTbl = /\+/.test(locNum);
    var dineNumClass = isCombinedTbl ? 'font-headline-lg text-headline-lg' : 'font-display-lg text-display-lg';
    var tableLabel = order.isTakeaway
      ? '<span class="font-label-md text-on-surface-variant uppercase tracking-wider">Para Llevar' + (order.tableNumber ? ' · Mesa ' + locNum : '') + '</span>'
      : '<span class="font-label-md text-on-surface-variant uppercase tracking-wider">Mesa</span><div class="' + dineNumClass + ' ' + headerClass + ' leading-none">' + (isCombinedTbl ? locNum : locNum.padStart(2, '0')) + '</div>';

    var itemsHtml = order.items.map(function (item) {
      var isDone = item.status === 'READY';
      var doneStyle = isDone && !isReady ? 'bg-secondary/10 opacity-70' : isDone ? 'bg-secondary/10' : 'bg-surface-container-low/60';
      return '<li class="flex items-center gap-2 ' + doneStyle + ' px-2 py-2 rounded-md">' +
        (item.quantity > 1 ? '<span class="font-bold ' + (isDone ? 'text-secondary' : headerClass) + '">' + item.quantity + 'x</span>' : '') +
        '<span class="flex-1 ' + (isDone && !isReady ? 'line-through text-on-surface-variant' : '') + '">' + escHtml(item.name) + '</span>' +
        (item.isTakeaway ? '<span class="material-symbols-outlined text-outline text-[16px]" title="Para llevar">takeout_dining</span>' : '') +
        (isDone
          ? '<span class="text-secondary font-label-md flex items-center gap-1"><span class="material-symbols-outlined text-[16px]" style="font-variation-settings:\'FILL\' 1">check_circle</span> Listo</span>'
          : '') +
        '</li>';
    }).join('');

    var notesHtml = order.notes
      ? '<div class="bg-surface-container-highest text-on-surface font-label-md p-3 rounded-md flex items-start gap-2"><span class="material-symbols-outlined text-tertiary text-sm">edit_note</span><span>' + escHtml(order.notes) + '</span></div>'
      : '';

    var borderClass = isInProgress ? 'border border-tertiary/30 relative overflow-hidden' : isReady ? 'border border-secondary/40 relative overflow-hidden' : 'border border-surface-variant';
    var leftBar = (isInProgress || isReady) ? '<div class="absolute top-0 left-0 w-1 h-full ' + (isInProgress ? 'bg-tertiary' : 'bg-secondary') + '"></div>' : '';
    var pl = (isInProgress || isReady) ? ' pl-2' : '';
    var am = (isInProgress || isReady) ? ' ml-1' : '';

    var readyInfoHtml = '';
    if (isReady) {
      readyInfoHtml = '<div class="mt-2 bg-secondary text-on-secondary h-[48px] rounded-lg font-label-lg flex items-center justify-center gap-2 w-full' + am + ' shadow-sm">' +
        '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">room_service</span>Listo para entregar</div>';
    }

    var article = document.createElement('article');
    article.className = 'bg-surface rounded-lg shadow-sm ' + borderClass + ' p-4 flex flex-col gap-4';
    article.innerHTML = leftBar +
      '<div class="flex justify-between items-start border-b border-surface-variant pb-3' + pl + '">' +
        '<div>' + tableLabel + '</div>' +
        '<div class="text-right"><span class="font-label-md ' + elapsedClass + '">' + elapsed + '</span><div class="font-headline-md text-on-surface">' + timeLabel(order.createdAt) + '</div></div>' +
      '</div>' +
      '<ul class="font-body-lg text-on-surface space-y-2' + (pl ? ' pl-2' : '') + '">' + itemsHtml + '</ul>' +
      notesHtml +
      readyInfoHtml;

    return article;
  }

  function renderColumn(colId, colOrders, colType, emptyMsg) {
    var col = document.getElementById(colId);
    col.innerHTML = '';
    if (colOrders.length === 0) {
      var p = document.createElement('p');
      p.className = 'text-center text-on-surface-variant font-label-md py-4';
      p.textContent = emptyMsg;
      col.appendChild(p);
    } else {
      colOrders.forEach(function (o) { col.appendChild(renderOrder(o, colType)); });
    }

    if (colType === 'ready') {
      var infoDiv = document.createElement('div');
      infoDiv.className = 'bg-surface-container-low border border-dashed border-outline-variant rounded-lg p-3 flex items-start gap-2 mt-2';
      infoDiv.innerHTML = '<span class="material-symbols-outlined text-[18px] text-outline mt-0.5">info</span><p class="font-label-md text-on-surface-variant">Los pedidos marcados como "Listo" permanecen aquí hasta que el mesero los entregue.</p>';
      col.appendChild(infoDiv);
    }
  }

  function renderKanban() {
    var pending = orders.filter(function (o) { return o.status === 'PENDING'; });

    var inProgress = [];
    orders.filter(function (o) { return o.status === 'IN_PROGRESS'; }).forEach(function (o) {
      var ip = o.items.filter(function (i) { return i.status === 'IN_PROGRESS'; });
      if (ip.length > 0) inProgress.push(Object.assign({}, o, { items: ip }));
    });

    var ready = [];
    orders.forEach(function (o) {
      var rdy = o.items.filter(function (i) { return i.status === 'READY'; });
      if (rdy.length > 0) ready.push(Object.assign({}, o, { items: rdy }));
    });

    document.getElementById('count-pending').textContent = pending.length;
    document.getElementById('count-inprogress').textContent = inProgress.length;
    document.getElementById('count-ready').textContent = ready.length;

    renderColumn('col-pending', pending, 'pending', 'Sin pedidos pendientes');
    renderColumn('col-inprogress', inProgress, 'inprogress', 'Sin pedidos en proceso');
    renderColumn('col-ready', ready, 'ready', 'Sin pedidos listos');
  }

  function loadOrders() {
    apiReq('GET', '/kitchen/orders').then(function (res) {
      if (!res.ok) return;
      orders = res.data;
      renderKanban();
    });
  }

  loadOrders();

  if (CB.socket) {
    CB.joinRoom('kitchen');
    CB.socket.on('orders:new', function () { loadOrders(); });
    CB.socket.on('orders:updated', function () { loadOrders(); });
    // Tras reconectar, recargar la cola de cocina.
    CB.onReconnect(loadOrders);
  }
})();
