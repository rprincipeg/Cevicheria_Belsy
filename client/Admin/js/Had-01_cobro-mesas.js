(function () {
  if (!window.CB || !CB.protectPage(['admin'])) return;

  var API_BASE = CB.CONFIG.API_BASE;

  var state = {
    summary: null,
    bill: null,
    context: null,
    documentType: 'BOLETA',
    isPartial: false,
    selectedItemIds: {},
    processing: false,
    lastPaymentResult: null,
  };

  var tablesGrid = document.getElementById('tablesGrid');
  var tableSelector = document.getElementById('table-selector');
  var checkoutDetail = document.getElementById('checkout-detail');
  var ordersList = document.getElementById('orders-list');
  var totalDisplay = document.getElementById('total-display');
  var paidInfo = document.getElementById('paid-info');
  var paidAmountDisplay = document.getElementById('paid-amount-display');
  var remainingDisplay = document.getElementById('remaining-display');
  var amountInput = document.getElementById('amount-input');
  var cashReceived = document.getElementById('cash-received');
  var changeDisplay = document.getElementById('change-display');
  var changeBox = document.getElementById('change-box');
  var partialCheckbox = document.getElementById('partial-payment');
  var documentSection = document.getElementById('document-section');
  var documentFields = document.getElementById('document-fields');
  var customerNameField = document.getElementById('customer-name-field');
  var documentLabel = document.getElementById('document-label');
  var customerDocument = document.getElementById('customer-document');
  var customerName = document.getElementById('customer-name');
  var confirmBtn = document.getElementById('confirm-payment-btn');
  var confirmLabel = document.getElementById('confirm-payment-label');
  var amountHint = document.getElementById('amount-hint');
  var feedbackToast = document.getElementById('feedback-toast');
  var toastMessage = document.getElementById('toast-message');
  var toastIcon = document.getElementById('toast-icon');
  var successModal = document.getElementById('success-modal');
  var successMessage = document.getElementById('success-message');
  var downloadReceiptLink = document.getElementById('download-receipt-link');

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function formatMoney(value) {
    return 'S/ ' + Number(value || 0).toFixed(2);
  }

  // Etiqueta de la mesa: "1" o, si tiene mesas fusionadas, "1 + 2".
  function tableLabelText(table) {
    var nums = [table.number].concat(table.mergedSourceNumbers || []);
    nums.sort(function (a, b) { return a - b; });
    return nums.join(' + ');
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  function getToken() {
    return sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
  }

  async function apiReq(method, path, body) {
    var headers = { Authorization: 'Bearer ' + getToken() };
    var opts = { method: method, headers: headers };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    var response = await fetch(API_BASE + path, opts);
    var data = null;
    try {
      data = await response.json();
    } catch (_err) {
      data = null;
    }

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

  function showToast(message, isError) {
    toastMessage.textContent = message;
    toastIcon.textContent = isError ? 'error' : 'check_circle';
    feedbackToast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(function () {
      feedbackToast.classList.add('translate-y-24', 'opacity-0');
    }, 4000);
  }

  function getUnpaidItems() {
    if (!state.bill) return [];
    return state.bill.orders.flatMap(function (order) {
      return order.items.filter(function (item) { return !item.isPaid; });
    });
  }

  function getSelectedItemIds() {
    return Object.keys(state.selectedItemIds).filter(function (id) { return state.selectedItemIds[id]; });
  }

  function getSelectedAmount() {
    var selectedIds = getSelectedItemIds();
    return getUnpaidItems().reduce(function (sum, item) {
      return selectedIds.indexOf(item.id) !== -1 ? sum + Number(item.subtotal) : sum;
    }, 0);
  }

  function syncSelectedItemsForMode() {
    var unpaid = getUnpaidItems();
    state.selectedItemIds = {};
    if (state.isPartial) {
      return;
    }
    unpaid.forEach(function (item) {
      state.selectedItemIds[item.id] = true;
    });
  }

  function isFinalPayment() {
    if (!state.bill) return true;
    return getSelectedAmount() >= state.bill.remainingBalance - 0.001;
  }

  function updateDocumentVisibility() {
    documentSection.classList.remove('hidden');
    documentFields.classList.remove('hidden');
    customerNameField.classList.toggle('hidden', state.documentType === 'BOLETA');
  }

  function setDocumentType(type) {
    state.documentType = type;
    var boletaBtn = document.getElementById('btn-boleta');
    var facturaBtn = document.getElementById('btn-factura');
    if (type === 'BOLETA') {
      boletaBtn.className = 'flex-1 h-touch-target bg-primary text-on-primary rounded-lg font-label-lg';
      facturaBtn.className = 'flex-1 h-touch-target border border-outline text-on-surface-variant rounded-lg font-label-lg hover:bg-surface-container';
      documentLabel.textContent = 'DNI del cliente';
      customerDocument.placeholder = 'Ingrese DNI (8 dígitos)';
      customerName.placeholder = 'Opcional para boleta';
      customerNameField.classList.add('hidden');
    } else {
      facturaBtn.className = 'flex-1 h-touch-target bg-primary text-on-primary rounded-lg font-label-lg';
      boletaBtn.className = 'flex-1 h-touch-target border border-outline text-on-surface-variant rounded-lg font-label-lg hover:bg-surface-container';
      documentLabel.textContent = 'RUC de la empresa';
      customerDocument.placeholder = 'Ingrese RUC (11 dígitos)';
      customerName.placeholder = 'Razón social (requerido)';
      customerNameField.classList.remove('hidden');
    }
    updateDocumentVisibility();
  }

  function updateAmountField() {
    if (!state.bill) return;
    var amount = getSelectedAmount();
    amountInput.setAttribute('readonly', 'readonly');
    amountInput.value = amount > 0 ? amount.toFixed(2) : '';
    if (amountHint) {
      amountHint.textContent = state.isPartial
        ? 'Seleccione los ítems a cobrar en la cuenta. El monto se calcula automáticamente.'
        : 'Se cobrarán todos los ítems pendientes de la cuenta.';
    }
    confirmLabel.textContent = 'Cobrar ' + formatMoney(amount || 0);
    updateChangeDisplay();
    updateDocumentVisibility();
  }

  function updateChangeDisplay() {
    var amount = getSelectedAmount();
    var received = parseFloat(cashReceived.value) || 0;
    var change = received - amount;
    if (received > 0 && change >= 0) {
      changeDisplay.textContent = formatMoney(change);
      changeBox.classList.remove('bg-error/10', 'border-error/20');
      changeBox.classList.add('bg-secondary-container/20', 'border-secondary/20');
    } else {
      changeDisplay.textContent = formatMoney(0);
      if (received > 0 && change < 0) {
        changeBox.classList.add('bg-error/10', 'border-error/20');
        changeBox.classList.remove('bg-secondary-container/20', 'border-secondary/20');
      }
    }
    confirmLabel.textContent = 'Cobrar ' + formatMoney(amount || 0);
    updateDocumentVisibility();
  }

  function onItemSelectionChange(itemId, checked) {
    if (checked) {
      state.selectedItemIds[itemId] = true;
    } else {
      delete state.selectedItemIds[itemId];
    }
    updateAmountField();
  }

  function renderTableGrid() {
    if (!tablesGrid || !state.summary) return;

    var html = '';

    // Cada pedido para llevar se muestra y se cobra POR SEPARADO, como una
    // tarjeta independiente etiquetada "Pedido para llevar N".
    var takeawayOrders = state.summary.takeawayOrders || [];
    takeawayOrders.forEach(function (to) {
      if (!(to.remainingBalance > 0)) return;
      html +=
        '<button type="button" data-takeaway-id="' + escHtml(to.id) + '" class="group relative overflow-hidden h-32 rounded-xl bg-primary text-on-primary flex flex-col items-center justify-center gap-1 shadow-lg transition-transform hover:scale-[1.02] active:scale-95">' +
        '<span class="material-symbols-outlined text-3xl">takeout_dining</span>' +
        '<span class="font-headline-md text-headline-md text-center px-2 leading-tight">' + escHtml(to.label) + '</span>' +
        '<span class="font-label-lg">' + formatMoney(to.remainingBalance) + '</span></button>';
    });

    state.summary.tables.forEach(function (table) {
      // Las mesas fusionadas no se muestran como tarjeta propia: aparecen
      // combinadas dentro de la caja de su mesa destino ("Mesa 1 + 2").
      if (table.status === 'MERGED') return;

      var isPaid = table.status === 'PAID';
      var selectable = !isPaid && table.hasActiveOrders && table.remainingBalance > 0;
      var label = tableLabelText(table);

      var btnClass, content;
      if (isPaid) {
        btnClass = 'bg-[#bbf7d0] hover:bg-[#86efac] border-2 border-[#4ade80] cursor-pointer shadow-sm transition-all';
        content =
          '<span class="material-symbols-outlined absolute top-2 right-2 text-[#16a34a] text-[20px]">lock_open</span>' +
          '<span class="font-headline-md text-headline-md text-[#14532d]">Mesa ' + label + '</span>' +
          '<span class="font-label-md text-label-md text-[#15803d] text-center px-3 leading-tight">Cobrada · presiona para liberar</span>';
      } else if (selectable) {
        btnClass = 'bg-tertiary-fixed hover:bg-tertiary-container transition-all cursor-pointer shadow-sm';
        content =
          '<span class="font-headline-md text-headline-md">Mesa ' + label + '</span>' +
          '<span class="font-label-lg">' + formatMoney(table.remainingBalance) + '</span>' +
          '<span class="material-symbols-outlined absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">payments</span>';
      } else {
        btnClass = 'bg-surface-container-high border border-outline-variant opacity-60 cursor-not-allowed';
        content =
          '<span class="font-headline-md text-headline-md">Mesa ' + label + '</span>' +
          '<span class="text-label-md">Disponible</span>';
      }

      html +=
        '<button type="button" data-table-id="' + table.id + '" ' +
        (isPaid ? 'data-release="1" ' : '') +
        (!isPaid && !selectable ? 'disabled ' : '') +
        'class="' + btnClass + ' h-32 rounded-xl flex flex-col items-center justify-center gap-1 group relative">' +
        content + '</button>';
    });

    tablesGrid.innerHTML = html || '<div class="col-span-full text-center py-12 text-on-surface-variant">No hay mesas con cobros pendientes.</div>';

    tablesGrid.querySelectorAll('[data-release]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        releaseTable(parseInt(btn.getAttribute('data-table-id'), 10), btn);
      });
    });
    tablesGrid.querySelectorAll('[data-table-id]:not([data-release])').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openCheckout('table', parseInt(btn.getAttribute('data-table-id'), 10));
      });
    });
    tablesGrid.querySelectorAll('[data-takeaway-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openCheckout('takeaway', btn.getAttribute('data-takeaway-id'));
      });
    });
  }

  function renderOrders() {
    if (!ordersList || !state.bill) return;

    ordersList.innerHTML = state.bill.orders.map(function (order, index) {
      var itemsHtml = order.items.map(function (item) {
        var takeawayTag = item.isTakeaway ? ' <span class="text-label-md text-primary">(para llevar)</span>' : '';
        var paidTag = item.isPaid ? ' <span class="text-label-md text-secondary font-bold">(pagado)</span>' : '';
        var checkboxHtml = '';

        if (!item.isPaid && state.isPartial) {
          var checked = !!state.selectedItemIds[item.id];
          checkboxHtml =
            '<label class="flex items-start gap-3 cursor-pointer">' +
            '<input type="checkbox" class="item-pay-checkbox mt-1 w-4 h-4 rounded border-outline text-primary focus:ring-primary" ' +
            'data-item-id="' + escHtml(item.id) + '" ' + (checked ? 'checked ' : '') + '/>' +
            '<span class="flex-1">' + item.quantity + 'x ' + escHtml(item.name) + takeawayTag +
            '<span class="block text-label-md text-on-surface-variant">' + formatMoney(item.unitPrice) + ' c/u</span></span>' +
            '<span class="font-bold whitespace-nowrap">' + formatMoney(item.subtotal) + '</span>' +
            '</label>';
          return '<div class="py-2">' + checkboxHtml + '</div>';
        }

        return (
          '<div class="py-2 flex justify-between gap-4' + (item.isPaid ? ' opacity-60' : '') + '">' +
          '<span>' + item.quantity + 'x ' + escHtml(item.name) + takeawayTag + paidTag +
          '<span class="block text-label-md text-on-surface-variant">' + formatMoney(item.unitPrice) + ' c/u</span></span>' +
          '<span class="font-bold whitespace-nowrap">' + formatMoney(item.subtotal) + '</span>' +
          '</div>'
        );
      }).join('');

      var notesHtml = order.notes
        ? '<p class="text-label-md text-on-surface-variant italic mt-2">Notas: ' + escHtml(order.notes) + '</p>'
        : '';

      return (
        '<details class="group bg-surface rounded-lg overflow-hidden border border-outline-variant"' +
        (index === 0 ? ' open' : '') + '>' +
        '<summary class="flex justify-between items-center p-4 cursor-pointer hover:bg-surface-container-lowest list-none">' +
        '<div class="flex items-center gap-3">' +
        '<span class="material-symbols-outlined text-primary">restaurant</span>' +
        '<span class="font-label-lg text-label-lg">Pedido ' + escHtml(order.code || ('#' + (index + 1))) +
        ' (' + formatTime(order.createdAt) + ')</span></div>' +
        '<span class="font-label-lg font-bold">' + formatMoney(order.total) + '</span></summary>' +
        '<div class="px-4 pb-4 text-label-lg divide-y divide-outline-variant">' + itemsHtml + notesHtml + '</div></details>'
      );
    }).join('');

    ordersList.querySelectorAll('.item-pay-checkbox').forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        onItemSelectionChange(checkbox.getAttribute('data-item-id'), checkbox.checked);
      });
    });
  }

  function renderCheckout() {
    if (!state.bill) return;

    var entityName = state.context.type === 'takeaway'
      ? (state.bill.takeawayLabel || 'Pedido para llevar')
      : 'Mesa ' + (state.bill.tableLabel || state.bill.tableNumber);

    document.getElementById('active-entity-name').textContent = entityName;
    totalDisplay.textContent = formatMoney(state.bill.remainingBalance);
    document.querySelector('#checkout-detail h3').textContent =
      state.bill.paidAmount > 0 ? 'Saldo pendiente' : 'Total a cobrar';

    if (state.bill.paidAmount > 0) {
      paidInfo.classList.remove('hidden');
      paidAmountDisplay.textContent = formatMoney(state.bill.paidAmount);
      remainingDisplay.textContent = formatMoney(state.bill.remainingBalance);
    } else {
      paidInfo.classList.add('hidden');
    }

    renderOrders();
    cashReceived.value = '';
    customerDocument.value = '';
    customerName.value = '';
    partialCheckbox.checked = state.isPartial;
    syncSelectedItemsForMode();
    setDocumentType(state.documentType);
    updateAmountField();
  }

  async function loadSummary() {
    state.summary = await apiReq('GET', '/payments/summary');
    renderTableGrid();
  }

  async function loadBill() {
    if (!state.context) return;
    var path = state.context.type === 'takeaway'
      ? '/payments/takeaway/' + state.context.takeawayOrderId + '/bill'
      : '/payments/tables/' + state.context.tableId + '/bill';
    state.bill = await apiReq('GET', path);
    renderCheckout();
  }

  async function openCheckout(type, id) {
    state.context = {
      type: type,
      tableId: type === 'table' ? id : null,
      takeawayOrderId: type === 'takeaway' ? id : null,
    };
    state.isPartial = false;
    state.selectedItemIds = {};
    state.documentType = 'BOLETA';
    try {
      await loadBill();
      tableSelector.classList.add('hidden');
      checkoutDetail.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast(err.message || 'No se pudo cargar la cuenta', true);
    }
  }

  function goBack() {
    checkoutDetail.classList.add('hidden');
    tableSelector.classList.remove('hidden');
    state.bill = null;
    state.context = null;
    state.isPartial = false;
    state.selectedItemIds = {};
    loadSummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validatePayment() {
    if (!state.bill) return 'No hay cuenta cargada';

    var selectedIds = getSelectedItemIds();
    var amount = getSelectedAmount();
    var received = parseFloat(cashReceived.value);

    if (selectedIds.length === 0) {
      return state.isPartial
        ? 'Seleccione al menos un ítem para el pago parcial'
        : 'No hay ítems pendientes por cobrar';
    }
    if (!amount || amount <= 0) return 'Seleccione ítems con monto válido a pagar';
    if (!received || received < amount - 0.001) {
      return 'El efectivo recibido debe ser mayor o igual al monto a pagar';
    }

    var doc = (customerDocument.value || '').trim();
    if (state.documentType === 'BOLETA') {
      if (!/^\d{8}$/.test(doc)) return 'Ingrese un DNI válido de 8 dígitos para la boleta';
    } else {
      if (!/^\d{11}$/.test(doc)) return 'Ingrese un RUC válido de 11 dígitos para la factura';
      if (!(customerName.value || '').trim()) return 'Ingrese la razón social para la factura';
    }

    return null;
  }

  function showSuccessModal(result) {
    state.lastPaymentResult = result;
    var msg = 'Pago registrado correctamente.';
    if (result.isFullyPaid) {
      msg += ' La cuenta está totalmente cobrada. La mesa quedará en estado "Por liberar".';
    } else {
      msg += ' Saldo pendiente: ' + formatMoney(result.remainingBalance) + '.';
    }
    if (result.pdfPath || (result.payment && result.payment.id)) {
      msg += ' El comprobante PDF fue generado.';
    }
    successMessage.textContent = msg;

    if (result.payment && result.payment.id) {
      downloadReceiptLink.href = API_BASE + '/payments/receipt/' + result.payment.id + '?token=' + encodeURIComponent(getToken());
      downloadReceiptLink.classList.remove('hidden');
      downloadReceiptLink.onclick = function (e) {
        e.preventDefault();
        fetch(API_BASE + '/payments/receipt/' + result.payment.id, {
          headers: { Authorization: 'Bearer ' + getToken() },
        }).then(function (r) { return r.blob(); }).then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'comprobante-' + result.payment.id + '.pdf';
          a.click();
          URL.revokeObjectURL(url);
        });
      };
    } else {
      downloadReceiptLink.classList.add('hidden');
    }

    document.getElementById('success-modal').querySelector('h3').textContent =
      result.isFullyPaid ? 'Pago completado' : 'Pago registrado';

    successModal.classList.remove('hidden');
    successModal.classList.add('flex');
  }

  function hideSuccessModal() {
    successModal.classList.add('hidden');
    successModal.classList.remove('flex');
    if (state.lastPaymentResult && state.lastPaymentResult.isFullyPaid) {
      state.lastPaymentResult = null;
      goBack();
      return;
    }
    state.lastPaymentResult = null;
    state.isPartial = false;
    partialCheckbox.checked = false;
    loadBill().catch(function (err) {
      showToast(err.message || 'No se pudo actualizar la cuenta', true);
    });
  }

  async function confirmPayment() {
    if (state.processing) return;
    var validationError = validatePayment();
    if (validationError) {
      showToast(validationError, true);
      return;
    }

    var received = parseFloat(cashReceived.value);
    var payload = {
      receivedAmount: received,
      orderItemIds: getSelectedItemIds(),
      documentType: state.documentType,
      customerDocument: (customerDocument.value || '').trim(),
      customerName: (customerName.value || '').trim() || undefined,
      isPartial: state.isPartial && !isFinalPayment(),
    };

    var path = state.context.type === 'takeaway'
      ? '/payments/takeaway/' + state.context.takeawayOrderId
      : '/payments/tables/' + state.context.tableId;

    state.processing = true;
    confirmBtn.disabled = true;

    try {
      var result = await apiReq('POST', path, payload);
      showSuccessModal(result);
    } catch (err) {
      showToast(err.message || 'No se pudo procesar el pago', true);
    } finally {
      state.processing = false;
      confirmBtn.disabled = false;
    }
  }

  async function releaseTable(tableId, btn) {
    if (btn) { btn.disabled = true; }
    try {
      await apiReq('PATCH', '/payments/tables/' + tableId + '/release');
      showToast('Mesa liberada correctamente', false);
      loadSummary();
    } catch (err) {
      showToast(err.message || 'No se pudo liberar la mesa', true);
      if (btn) { btn.disabled = false; }
    }
  }

  document.getElementById('logoutBtn').addEventListener('click', function () {
    CB.logout();
  });
  document.getElementById('backBtn').addEventListener('click', goBack);
  document.getElementById('cancel-checkout-btn').addEventListener('click', goBack);
  document.getElementById('btn-boleta').addEventListener('click', function () { setDocumentType('BOLETA'); });
  document.getElementById('btn-factura').addEventListener('click', function () { setDocumentType('FACTURA'); });
  partialCheckbox.addEventListener('change', function () {
    state.isPartial = partialCheckbox.checked;
    syncSelectedItemsForMode();
    renderOrders();
    updateAmountField();
  });
  cashReceived.addEventListener('input', updateChangeDisplay);
  confirmBtn.addEventListener('click', confirmPayment);
  document.getElementById('success-close-btn').addEventListener('click', hideSuccessModal);

  if (CB.socket) {
    CB.socket.on('tables:updated', function () {
      if (!state.context) loadSummary();
    });
    // Tras reconectar, recargar el resumen (salvo si hay un cobro en curso).
    CB.onReconnect(function () { if (!state.context) loadSummary(); });
  }

  loadSummary().catch(function (err) {
    showToast(err.message || 'Error al cargar mesas', true);
  });
})();
