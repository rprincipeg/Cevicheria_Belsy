(function () {
  if (!window.CB || !CB.protectPage(['admin'])) return;

  var API_BASE = (CB.CONFIG && CB.CONFIG.API_BASE) ? CB.CONFIG.API_BASE : 'http://localhost:3001/api';

  var state = {
    categories: [],
    activeCategoryId: null,
  };

  var categoryList = document.getElementById('categoryList');
  var itemsGrid = document.getElementById('itemsGrid');
  var currentCategoryTitle = document.getElementById('currentCategoryTitle');
  var itemCategorySelect = document.getElementById('itemCategorySelect');

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function getAllItems() {
    return state.categories.flatMap(function (cat) {
      return (cat.items || []).map(function (item) {
        return Object.assign({}, item, {
          categoryId: cat.id,
          categoryName: cat.name,
        });
      });
    });
  }

  function getCategoryById(id) {
    return state.categories.find(function (cat) { return cat.id === id; }) || null;
  }

  function getItemById(id) {
    return getAllItems().find(function (item) { return item.id === id; }) || null;
  }

  async function apiReq(method, path, body) {
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    var headers = { 'Authorization': 'Bearer ' + token };
    var opts = { method: method, headers: headers };

    if (body instanceof FormData) {
      opts.body = body;
    } else if (body !== undefined) {
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
      throw { status: response.status, message: typeof message === 'string' ? message : 'Error en la peticion', data: data };
    }

    return response.status === 204 ? null : data;
  }

  function renderCategories() {
    if (!categoryList) return;

    if (!state.categories.length) {
      categoryList.innerHTML = '<div class="px-3 py-4 text-sm text-on-surface-variant">No hay categorias todavia.</div>';
    } else {
      categoryList.innerHTML = state.categories.map(function (cat) {
        var isActive = state.activeCategoryId === cat.id;
        var itemCount = (cat.items || []).length;
        return (
          '<div class="group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ' +
            (isActive ? 'bg-primary text-on-primary shadow-md' : 'hover:bg-surface-container-highest text-on-surface-variant') + '"' +
            ' onclick="setActiveCategory(\'' + escHtml(cat.id) + '\')">' +
            '<div class="min-w-0 flex-1">' +
              '<span class="font-label-lg truncate block">' + escHtml(cat.name) + '</span>' +
              '<span class="text-xs opacity-80">' + itemCount + ' ítems</span>' +
            '</div>' +
            '<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">' +
              '<button onclick="event.stopPropagation(); openCategoryModal(\'' + escHtml(cat.id) + '\')" class="p-1 hover:bg-white/20 rounded" title="Editar categoria">' +
                '<span class="material-symbols-outlined text-[18px]" data-icon="edit">edit</span>' +
              '</button>' +
              '<button onclick="event.stopPropagation(); deleteCategory(\'' + escHtml(cat.id) + '\')" class="p-1 hover:bg-white/20 rounded" title="Eliminar categoria">' +
                '<span class="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>' +
              '</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    if (itemCategorySelect) {
      itemCategorySelect.innerHTML = state.categories.map(function (cat) {
        return '<option value="' + escHtml(cat.id) + '">' + escHtml(cat.name) + '</option>';
      }).join('');
    }
  }

  function renderItems() {
    if (!itemsGrid || !currentCategoryTitle) return;

    var activeCat = getCategoryById(state.activeCategoryId);
    var items = activeCat ? (activeCat.items || []) : [];
    currentCategoryTitle.innerText = activeCat ? activeCat.name : 'Selecciona una categoria';

    if (!activeCat) {
      itemsGrid.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center py-20 text-outline"><span class="material-symbols-outlined text-6xl mb-4">inventory</span><p class="font-body-lg">Selecciona una categoria</p></div>';
      return;
    }

    if (!items.length) {
      itemsGrid.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center py-20 text-outline"><span class="material-symbols-outlined text-6xl mb-4">inventory</span><p class="font-body-lg">No hay ítems en esta categoría</p></div>';
      return;
    }

    itemsGrid.innerHTML = items.map(function (item) {
      var isAvailable = item.stockStatus !== 'OUT_OF_STOCK';
      var price = Number(item.price || 0);
      var description = item.description || '';

      return [
        '<div class="bg-surface-container-high rounded-xl overflow-hidden flex flex-col group border border-transparent hover:border-primary/20 hover:shadow-xl transition-all duration-300">',
          '<div class="relative h-48 overflow-hidden">',
            '<img src="' + escHtml(CB.assetUrl(item.imageUrl) || 'https://images.unsplash.com/photo-1535850452425-140ee4a8dbae?q=80&w=800&auto=format&fit=crop') + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="' + escHtml(item.name) + '">',
            '<div class="absolute top-3 left-3">',
              '<span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ' + (isAvailable ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container') + ' shadow-sm">',
                isAvailable ? 'Disponible' : 'Agotado',
              '</span>',
            '</div>',
          '</div>',
          '<div class="p-4 flex-1 flex flex-col">',
            '<div class="flex justify-between items-start mb-2">',
              '<h4 class="font-label-lg text-headline-sm text-on-surface line-clamp-1">' + escHtml(item.name) + '</h4>',
              '<span class="font-bold text-primary">S/ ' + price.toFixed(2) + '</span>',
            '</div>',
            '<p class="text-on-surface-variant text-sm line-clamp-2 mb-4 flex-1">' + escHtml(description) + '</p>',
            '<div class="grid grid-cols-3 gap-2 border-t border-outline-variant pt-4">',
              '<button onclick="toggleStock(\'' + escHtml(item.id) + '\', ' + (!isAvailable) + ')" class="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors" title="' + (isAvailable ? 'Marcar agotado' : 'Marcar disponible') + '">',
                '<span class="material-symbols-outlined mb-1">' + (isAvailable ? 'check_circle' : 'do_not_disturb_on') + '</span>',
                '<span class="text-[10px] font-bold uppercase">Stock</span>',
              '</button>',
              '<button onclick="openItemModal(\'' + escHtml(item.id) + '\')" class="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors" title="Editar">',
                '<span class="material-symbols-outlined mb-1">edit_square</span>',
                '<span class="text-[10px] font-bold uppercase">Editar</span>',
              '</button>',
              '<button onclick="deleteItem(\'' + escHtml(item.id) + '\')" class="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-error-container text-error transition-colors" title="Borrar">',
                '<span class="material-symbols-outlined mb-1">delete</span>',
                '<span class="text-[10px] font-bold uppercase">Borrar</span>',
              '</button>',
            '</div>',
          '</div>',
        '</div>',
      ].join('');
    }).join('');
  }

  function syncActiveCategoryAfterLoad() {
    if (!state.categories.length) {
      state.activeCategoryId = null;
      return;
    }

    var stillExists = state.categories.some(function (cat) { return cat.id === state.activeCategoryId; });
    if (!stillExists) {
      state.activeCategoryId = state.categories[0].id;
    }
  }

  async function loadData() {
    try {
      var cats = await apiReq('GET', '/menu/admin/categories');
      state.categories = Array.isArray(cats) ? cats : [];
      syncActiveCategoryAfterLoad();
      renderCategories();
      renderItems();
    } catch (error) {
      console.error('Error cargando datos del menu', error);
      CB.alert(error && error.message ? error.message : 'Error cargando datos del menu');
    }
  }

  function closeModals() {
    document.querySelectorAll('[id$="Modal"]').forEach(function (modal) {
      modal.classList.add('hidden');
    });
  }

  window.setActiveCategory = function (id) {
    state.activeCategoryId = id;
    renderCategories();
    renderItems();
  };

  window.openCategoryModal = function (id) {
    var modal = document.getElementById('categoryModal');
    var title = document.getElementById('categoryModalTitle');
    var nameInput = document.getElementById('categoryName');
    var idInput = document.getElementById('categoryId');
    var category = id ? getCategoryById(id) : null;

    if (category) {
      title.innerText = 'Editar Categoria';
      nameInput.value = category.name;
      idInput.value = category.id;
    } else {
      title.innerText = 'Nueva Categoria';
      nameInput.value = '';
      idInput.value = '';
    }

    modal.classList.remove('hidden');
  };

  window.openItemModal = function (id) {
    var modal = document.getElementById('itemModal');
    var title = document.getElementById('itemModalTitle');
    var form = document.getElementById('itemForm');
    var preview = document.getElementById('itemImagePreview');
    var item = id ? getItemById(id) : null;

    form.reset();
    preview.classList.add('hidden');

    if (item) {
      title.innerText = 'Editar Ítem';
      document.getElementById('itemId').value = item.id;
      document.getElementById('itemName').value = item.name;
      document.getElementById('itemPrice').value = Number(item.price);
      document.getElementById('itemDescription').value = item.description || '';
      document.getElementById('itemCategorySelect').value = item.categoryId;
      if (item.imageUrl) {
        preview.src = CB.assetUrl(item.imageUrl);
        preview.classList.remove('hidden');
      }
    } else {
      title.innerText = 'Nuevo Ítem';
      document.getElementById('itemId').value = '';
      document.getElementById('itemCategorySelect').value = state.activeCategoryId || '';
    }

    modal.classList.remove('hidden');
  };

  window.deleteCategory = async function (id) {
    if (!(await CB.confirm('¿Seguro que deseas eliminar esta categoría?', { confirmLabel: 'Eliminar', icon: 'delete' }))) return;
    try {
      await apiReq('DELETE', '/menu/admin/categories/' + id);
      if (state.activeCategoryId === id) state.activeCategoryId = null;
      await loadData();
    } catch (error) {
      if (error && error.status === 409) {
        CB.alert('No se puede eliminar la categoría porque contiene ítems.');
      } else {
        CB.alert((error && error.message) || 'Error eliminando categoria');
      }
    }
  };

  window.deleteItem = async function (id) {
    if (!(await CB.confirm('¿Estás seguro de que deseas eliminar este ítem permanentemente?', { confirmLabel: 'Eliminar', icon: 'delete' }))) return;
    try {
      await apiReq('DELETE', '/menu/admin/items/' + id);
      await loadData();
    } catch (error) {
      CB.alert((error && error.message) || 'Error eliminando ítem');
    }
  };

  window.toggleStock = async function (id, status) {
    try {
      await apiReq('PATCH', '/menu/admin/items/' + id + '/stock', {
        stockStatus: status ? 'AVAILABLE' : 'OUT_OF_STOCK',
      });
      await loadData();
    } catch (error) {
      CB.alert((error && error.message) || 'Error actualizando stock');
    }
  };

  document.getElementById('categoryForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = document.getElementById('categoryId').value;
    var name = document.getElementById('categoryName').value.trim();

    try {
      if (id) {
        await apiReq('PATCH', '/menu/admin/categories/' + id, { name: name });
      } else {
        await apiReq('POST', '/menu/admin/categories', { name: name });
      }
      closeModals();
      await loadData();
    } catch (error) {
      CB.alert((error && error.message) || 'Error guardando categoria');
    }
  });

  document.getElementById('itemForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = document.getElementById('itemId').value;
    var data = {
      name: document.getElementById('itemName').value.trim(),
      price: parseFloat(document.getElementById('itemPrice').value),
      description: document.getElementById('itemDescription').value.trim() || null,
      categoryId: document.getElementById('itemCategorySelect').value,
    };
    var fileInput = document.getElementById('itemImage');

    try {
      var savedItem;
      if (id) {
        savedItem = await apiReq('PATCH', '/menu/admin/items/' + id, data);
      } else {
        savedItem = await apiReq('POST', '/menu/admin/items', data);
      }

      if (!savedItem || !savedItem.id) {
        throw new Error('No se pudo obtener el ítem guardado');
      }

      if (fileInput.files && fileInput.files.length > 0) {
        var formData = new FormData();
        formData.append('image', fileInput.files[0]);
        await apiReq('PATCH', '/menu/admin/items/' + savedItem.id + '/image', formData);
      }

      closeModals();
      await loadData();
    } catch (error) {
      CB.alert((error && error.message) || 'Error guardando ítem');
    }
  });

  document.getElementById('addCategoryBtn').onclick = function () { window.openCategoryModal(); };
  document.getElementById('addItemBtn').onclick = function () { window.openItemModal(); };
  document.getElementById('logoutBtn').onclick = function () { CB.logout(); };

  document.getElementById('itemImage').addEventListener('change', function () {
    var preview = document.getElementById('itemImagePreview');
    if (this.files && this.files[0]) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        preview.src = ev.target.result;
        preview.classList.remove('hidden');
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.onclick = closeModals;
  });

  if (CB.socket) {
    CB.socket.off('menu:updated', loadData);
    CB.socket.on('menu:updated', loadData);
    // Tras reconectar, recargar el menú.
    CB.onReconnect(loadData);
  }

  loadData();
})();
