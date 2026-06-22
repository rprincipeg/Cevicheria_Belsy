(function () {
  if (!CB.protectPage(['mesero', 'admin'])) return;

  var sess = CB.getSession();
  var userLabel = document.getElementById('user-label');
  if (sess && userLabel) userLabel.textContent = sess.usuario || (sess.rol.charAt(0).toUpperCase() + sess.rol.slice(1));

  if (sess && sess.rol === 'admin') {
    var btnCocina = document.getElementById('btn-cocina');
    if (btnCocina) {
      btnCocina.classList.remove('hidden');
      btnCocina.classList.add('flex');
      btnCocina.addEventListener('click', function () {
        window.location.href = '../Cocinero/HCoc-01_gestion-cocina.html';
      });
    }
  }

  document.getElementById('btn-logout').addEventListener('click', function () { CB.logout(); });

  function apiFetch(path) {
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    return fetch(CB.CONFIG.API_BASE + path, {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (r) { return r.json(); });
  }

  // ── Diálogos propios (sin el prefijo "localhost" de confirm/alert) ────────────
  function showConfirm(message, onConfirm, confirmLabel, icon) {
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4';
    overlay.innerHTML =
      '<div class="bg-surface rounded-xl shadow-lg max-w-sm w-full p-gutter flex flex-col gap-4">' +
        '<div class="flex items-start gap-3">' +
          '<span class="material-symbols-outlined text-primary mt-0.5" style="font-variation-settings:\'FILL\' 1">' + (icon || 'merge') + '</span>' +
          '<p class="font-body-md text-body-md text-on-surface flex-1">' + message + '</p>' +
        '</div>' +
        '<div class="flex justify-end gap-2">' +
          '<button data-act="cancel" class="h-touch-target-min px-5 rounded-full font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancelar</button>' +
          '<button data-act="ok" class="h-touch-target-min px-5 rounded-full font-label-lg text-label-lg bg-primary text-on-primary hover:opacity-90 transition-opacity">' + (confirmLabel || 'Confirmar') + '</button>' +
        '</div>' +
      '</div>';
    function close() { overlay.remove(); }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.getAttribute('data-act') === 'cancel') { close(); }
      else if (e.target.getAttribute('data-act') === 'ok') { close(); onConfirm(); }
    });
    document.body.appendChild(overlay);
  }

  function showAlert(message) {
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4';
    overlay.innerHTML =
      '<div class="bg-surface rounded-xl shadow-lg max-w-sm w-full p-gutter flex flex-col gap-4">' +
        '<div class="flex items-start gap-3">' +
          '<span class="material-symbols-outlined text-error mt-0.5" style="font-variation-settings:\'FILL\' 1">error</span>' +
          '<p class="font-body-md text-body-md text-on-surface flex-1">' + message + '</p>' +
        '</div>' +
        '<div class="flex justify-end">' +
          '<button data-act="ok" class="h-touch-target-min px-5 rounded-full font-label-lg text-label-lg bg-primary text-on-primary hover:opacity-90 transition-opacity">Entendido</button>' +
        '</div>' +
      '</div>';
    function close() { overlay.remove(); }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.getAttribute('data-act') === 'ok') { close(); }
    });
    document.body.appendChild(overlay);
  }

  // ── Fusión de mesas (drag & drop) ─────────────────────────────────────────────
  // Devuelve la etiqueta de la mesa: "1" o, si tiene mesas fusionadas, "1 + 2".
  function tableLabel(table) {
    var nums = [table.number].concat(table.mergedSourceNumbers || []);
    nums.sort(function (a, b) { return a - b; });
    return nums.join(' + ');
  }

  var dragJustEnded = false; // suprime el click que sigue a un arrastre
  var lastRealTables = [];   // últimas mesas reales (sin "takeaway") para el modal "Mover pedido"

  // Llama al backend para fusionar la mesa origen en la mesa destino.
  function mergeTables(sourceId, targetId, sourceLabel, targetLabel) {
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    return fetch(CB.CONFIG.API_BASE + '/tables/' + sourceId + '/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ targetTableId: parseInt(targetId, 10) }),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || 'No se pudo fusionar la mesa');
        return data;
      });
    }).then(function () {
      loadTables();
    }).catch(function (err) {
      showAlert(err.message || 'Error al fusionar las mesas.');
    });
  }

  // Separa una fusión SIN pedidos: libera cada mesa fusionada (y la de destino).
  function unmergeFusion(table) {
    var sources = table.mergedSources || [];
    if (sources.length === 0) return;
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    var chain = Promise.resolve();
    sources.forEach(function (s) {
      chain = chain.then(function () {
        return fetch(CB.CONFIG.API_BASE + '/tables/' + s.id + '/unmerge', {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + token },
        }).then(function (r) {
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.error || 'No se pudo separar la mesa');
            return data;
          });
        });
      });
    });
    chain.then(function () {
      loadTables();
    }).catch(function (err) {
      showAlert(err.message || 'Error al separar las mesas.');
      loadTables();
    });
  }

  // Mueve el pedido de una mesa ocupada a una mesa libre (libera el origen).
  function relocateOrder(sourceId, targetId) {
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    return fetch(CB.CONFIG.API_BASE + '/tables/' + sourceId + '/relocate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ targetTableId: parseInt(targetId, 10) }),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || 'No se pudo mover el pedido');
        return data;
      });
    }).then(function () {
      loadTables();
    }).catch(function (err) {
      showAlert(err.message || 'Error al mover el pedido.');
    });
  }

  // Modal "Mover pedido": elegir mesa ocupada (origen) y mesa libre (destino).
  function showMoveOrderModal() {
    // Origen: mesas ocupadas con pedidos (incluye fusionadas con cuenta).
    var occupied = lastRealTables.filter(function (t) {
      return t.status === 'OCCUPIED' && t.hasActiveOrders;
    });
    var free = lastRealTables.filter(function (t) { return t.status === 'FREE'; });

    if (occupied.length === 0) { showAlert('No hay mesas ocupadas con pedidos para mover.'); return; }
    if (free.length === 0) { showAlert('No hay mesas libres como destino.'); return; }

    function optionsHtml(list, useLabel) {
      return list.map(function (t) {
        return '<option value="' + t.id + '">Mesa ' + (useLabel ? tableLabel(t) : t.number) + '</option>';
      }).join('');
    }

    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4';
    overlay.innerHTML =
      '<div class="bg-surface rounded-xl shadow-lg max-w-sm w-full p-gutter flex flex-col gap-4">' +
        '<div class="flex items-center gap-3">' +
          '<span class="material-symbols-outlined text-primary" style="font-variation-settings:\'FILL\' 1">move_up</span>' +
          '<h2 class="font-headline-sm text-headline-sm text-on-surface flex-1">Mover pedido</h2>' +
        '</div>' +
        '<p class="font-body-md text-body-md text-on-surface-variant">Mueve el pedido a una mesa libre. La mesa de origen quedará libre.</p>' +
        '<label class="font-label-lg text-label-lg text-on-surface">Mesa de origen (ocupada)' +
          '<select id="mv-source" class="mt-1 w-full h-touch-target-min px-3 rounded-lg border border-outline-variant bg-surface text-on-surface">' + optionsHtml(occupied, true) + '</select>' +
        '</label>' +
        '<label class="font-label-lg text-label-lg text-on-surface">Mesa de destino (libre)' +
          '<select id="mv-target" class="mt-1 w-full h-touch-target-min px-3 rounded-lg border border-outline-variant bg-surface text-on-surface">' + optionsHtml(free, false) + '</select>' +
        '</label>' +
        '<div class="flex justify-end gap-2 mt-2">' +
          '<button data-act="cancel" class="h-touch-target-min px-5 rounded-full font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancelar</button>' +
          '<button data-act="ok" class="h-touch-target-min px-5 rounded-full font-label-lg text-label-lg bg-primary text-on-primary hover:opacity-90 transition-opacity">Mover</button>' +
        '</div>' +
      '</div>';
    function close() { overlay.remove(); }
    overlay.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (e.target === overlay || act === 'cancel') {
        close();
      } else if (act === 'ok') {
        var sourceId = overlay.querySelector('#mv-source').value;
        var targetId = overlay.querySelector('#mv-target').value;
        close();
        relocateOrder(sourceId, targetId);
      }
    });
    document.body.appendChild(overlay);
  }

  // Hace una tarjeta de mesa ocupada arrastrable para fusionarla sobre otra mesa.
  function makeDraggable(card, table) {
    card.style.touchAction = 'none';
    card.style.cursor = 'grab';
    card.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return; // solo botón primario
      startDrag(e, card, table);
    });
  }

  function startDrag(e, card, table) {
    var startX = e.clientX;
    var startY = e.clientY;
    var moved = false;
    var clone = null;
    var hoverCard = null;
    var w = card.offsetWidth;
    var h = card.offsetHeight;

    function clearHover() {
      if (hoverCard) { hoverCard.classList.remove('ring-4', 'ring-primary', 'scale-105'); hoverCard = null; }
    }

    function onMove(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      if (!moved && Math.sqrt(dx * dx + dy * dy) < 8) return;

      if (!moved) {
        moved = true;
        card.setPointerCapture && card.setPointerCapture(ev.pointerId);
        clone = card.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.width = w + 'px';
        clone.style.height = h + 'px';
        clone.style.margin = '0';
        clone.style.pointerEvents = 'none';
        clone.style.opacity = '0.9';
        clone.style.zIndex = '1000';
        clone.style.transform = 'scale(1.05)';
        clone.style.boxShadow = '0 12px 28px rgba(0,0,0,0.25)';
        document.body.appendChild(clone);
        card.style.opacity = '0.4';
      }

      clone.style.left = (ev.clientX - w / 2) + 'px';
      clone.style.top = (ev.clientY - h / 2) + 'px';

      // Detecta la mesa bajo el puntero
      clone.style.display = 'none';
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      clone.style.display = '';
      var targetCard = under ? under.closest('[data-table-id]') : null;

      if (targetCard !== hoverCard) clearHover();
      if (targetCard && isValidTarget(targetCard, table)) {
        hoverCard = targetCard;
        hoverCard.classList.add('ring-4', 'ring-primary', 'scale-105');
      }
    }

    function onUp(ev) {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (clone) clone.remove();
      card.style.opacity = '';

      var target = hoverCard;
      clearHover();

      if (!moved) return; // fue un tap → deja que el click navegue

      dragJustEnded = true;
      setTimeout(function () { dragJustEnded = false; }, 60);

      if (target && isValidTarget(target, table)) {
        var targetId = target.getAttribute('data-table-id');
        var targetLabel = target.getAttribute('data-table-label');
        showConfirm('¿Fusionar Mesa ' + tableLabel(table) + ' con Mesa ' + targetLabel + '?', function () {
          mergeTables(table.id, targetId, tableLabel(table), targetLabel);
        }, 'Fusionar', 'merge');
      }
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  // Una mesa es destino válido si es distinta a la origen y está libre u ocupada.
  function isValidTarget(targetCard, sourceTable) {
    var id = targetCard.getAttribute('data-table-id');
    var status = targetCard.getAttribute('data-status');
    if (!id || String(id) === String(sourceTable.id)) return false;
    return status === 'FREE' || status === 'OCCUPIED';
  }

  function renderTables(tableData) {
    if (!Array.isArray(tableData)) {
      document.getElementById('tables-loading').textContent = 'Error al cargar mesas. Intenta de nuevo.';
      return;
    }
    var loading = document.getElementById('tables-loading');
    var grid = document.getElementById('tables-grid');
    var divider = document.getElementById('section-divider');
    var takeawaySection = document.getElementById('takeaway-section');

    loading.classList.add('hidden');
    grid.innerHTML = '';

    // Las mesas fusionadas (MERGED) no se muestran como caja propia: aparecen
    // combinadas dentro de la caja de su mesa destino ("Mesa 1 + 2").
    var realTables = tableData.filter(function (t) { return t.id !== 'takeaway' && t.status !== 'MERGED'; });
    var hasTakeaway = tableData.some(function (t) { return t.id === 'takeaway'; });
    lastRealTables = realTables;

    if (realTables.length > 0) {
      grid.classList.remove('hidden');
      realTables.forEach(function (table) {
        var isFree = table.status === 'FREE';
        var isPaid = table.status === 'PAID';
        var label = tableLabel(table);
        var isCombined = (table.mergedSourceNumbers && table.mergedSourceNumbers.length > 0);
        // Etiquetas combinadas ("1 + 2") usan una tipografía algo menor para que entren.
        var numClass = isCombined ? 'font-headline-lg text-headline-lg' : 'font-display-lg text-display-lg';
        var card = isPaid ? document.createElement('div') : document.createElement('button');
        card.setAttribute('data-table-id', table.id);
        card.setAttribute('data-status', table.status);
        card.setAttribute('data-table-label', label);

        if (isFree) {
          card.className = 'w-full max-w-[220px] aspect-square bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center p-4 relative group hover:-translate-y-1';
          card.innerHTML =
            '<span class="material-symbols-outlined absolute top-4 right-4 text-outline group-hover:text-primary transition-colors">table_restaurant</span>' +
            '<span class="' + numClass + ' text-on-surface mb-3">' + label + '</span>' +
            '<div class="bg-[#86efac] text-[#14532d] px-4 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wide">Libre</div>';
          card.addEventListener('click', function () {
            if (dragJustEnded) return;
            window.location.href = 'Hme-02_visualizar-platos.html?tableId=' + table.id + '&tableNumber=' + table.number + '&tableLabel=' + encodeURIComponent(label);
          });
          // Las mesas libres también se pueden arrastrar para fusionarlas.
          makeDraggable(card, table);
        } else if (isPaid) {
          card.className = 'w-full max-w-[220px] aspect-square bg-[#bbf7d0] rounded-xl shadow-sm flex flex-col items-center justify-center p-4 relative ring-2 ring-[#4ade80]';
          card.innerHTML =
            '<span class="material-symbols-outlined absolute top-4 right-4 text-[#16a34a] text-[20px]">lock_open</span>' +
            '<span class="' + numClass + ' text-[#14532d] mb-3">' + label + '</span>' +
            '<div class="bg-[#86efac] text-[#14532d] px-4 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wide">Por liberar</div>';
        } else {
          // OCCUPIED (incluye mesas combinadas tras una fusión)
          // Una fusión SIN pedidos se puede separar para liberar las mesas.
          var canUnmerge = isCombined && !table.hasActiveOrders;
          var separarHtml = canUnmerge
            ? '<span class="js-unmerge absolute top-3 left-3 inline-flex items-center gap-1 bg-surface text-on-surface px-2 py-1 rounded-full shadow-sm font-label-md text-label-md cursor-pointer hover:bg-surface-container-high transition-colors" role="button">' +
                '<span class="material-symbols-outlined text-[16px]">call_split</span> Separar</span>'
            : '';
          card.className = 'w-full max-w-[220px] aspect-square bg-tertiary-fixed rounded-xl shadow-md flex flex-col items-center justify-center p-4 relative transform scale-[1.02] ring-2 ring-tertiary-fixed-dim border-transparent group hover:shadow-lg transition-all';
          card.innerHTML =
            separarHtml +
            '<span class="material-symbols-outlined absolute top-4 right-4 text-on-tertiary-fixed-variant" style="font-variation-settings: \'FILL\' 1;">' + (isCombined ? 'merge' : 'table_restaurant') + '</span>' +
            '<span class="' + numClass + ' text-on-tertiary-fixed-variant mb-3 text-center leading-tight">' + label + '</span>' +
            '<div class="flex flex-col items-center gap-1.5">' +
              '<div class="bg-tertiary text-on-tertiary px-4 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wide shadow-sm">' + (isCombined ? 'Fusionada' : 'Ocupada') + '</div>' +
              '<span class="font-label-md text-label-md text-on-tertiary-fixed-variant flex items-center gap-1">' +
                '<span class="material-symbols-outlined text-[14px]">add_circle</span> Añadir pedido' +
              '</span>' +
            '</div>';
          card.addEventListener('click', (function (t) {
            return function () {
              if (dragJustEnded) return;
              var url = 'Hme-02_visualizar-platos.html?tableId=' + t.id + '&tableNumber=' + t.number + '&tableLabel=' + encodeURIComponent(tableLabel(t));
              if (t.activeOrderId) url += '&orderId=' + t.activeOrderId;
              window.location.href = url;
            };
          })(table));
          // Botón "Separar" (no inicia arrastre ni navega a tomar pedido).
          if (canUnmerge) {
            var sepBtn = card.querySelector('.js-unmerge');
            if (sepBtn) {
              sepBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
              sepBtn.addEventListener('click', (function (t, lbl) {
                return function (e) {
                  e.stopPropagation();
                  showConfirm('¿Separar las mesas de la fusión Mesa ' + lbl + '? Quedarán libres.', function () {
                    unmergeFusion(t);
                  }, 'Separar', 'call_split');
                };
              })(table, label));
            }
          }
          // Las mesas ocupadas se pueden arrastrar para fusionarlas sobre otra mesa.
          makeDraggable(card, table);
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
    apiFetch('/tables').then(renderTables).catch(function (err) {
      CB.debug('Error cargando mesas:', err);
      document.getElementById('tables-loading').textContent = 'Error al cargar mesas. Verifica la conexión.';
    });
  }

  loadTables();

  document.getElementById('btn-takeaway').addEventListener('click', function () {
    window.location.href = 'Hme-02_visualizar-platos.html?isTakeaway=true';
  });

  var btnMover = document.getElementById('btn-mover-pedido');
  if (btnMover) btnMover.addEventListener('click', showMoveOrderModal);

  if (CB.socket) {
    CB.joinRoom('waiters');
    CB.socket.on('tables:updated', function (data) { renderTables(data); });
    // Tras reconectar, recargar el mapa por si otra persona cambió mesas.
    CB.onReconnect(loadTables);
  }
})();
