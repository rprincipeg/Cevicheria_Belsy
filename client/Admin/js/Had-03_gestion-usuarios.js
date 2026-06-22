(function () {
  if (!window.CB || !CB.protectPage(['admin'])) return;

  var API_BASE = CB.CONFIG.API_BASE;
  var showDisabled  = false;
  var allUsers      = [];
  var editingUserId = null;

  var tableBody     = document.getElementById('users-table-body');
  var tableTitle    = document.getElementById('users-table-title');
  var createBtn     = document.getElementById('createUserBtn');
  var disabledBtn   = document.getElementById('disabledUsersBtn');
  var logoutBtn     = document.getElementById('logoutBtn');

  var modal          = document.getElementById('user-modal');
  var modalTitle     = document.getElementById('modal-title');
  var modalFullname  = document.getElementById('modal-fullname');
  var modalUsername  = document.getElementById('modal-username');
  var modalPassword  = document.getElementById('modal-password');
  var modalPwdLabel  = document.getElementById('modal-pwd-label');
  var modalRoleRow   = document.getElementById('modal-role-row');
  var modalRole      = document.getElementById('modal-role');
  var modalError     = document.getElementById('modal-error');
  var modalSaveBtn   = document.getElementById('modal-save-btn');
  var modalCancelBtn = document.getElementById('modal-cancel-btn');

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

  // ── Data loading ──────────────────────────────────────────────────────────────

  async function loadUsers() {
    tableBody.innerHTML = '<tr><td class="px-6 py-4 text-on-surface-variant" colspan="5">Cargando...</td></tr>';
    try {
      var users = await apiReq('GET', '/users');
      if (users === null) return;
      allUsers = users;
      renderTable();
    } catch (e) {
      tableBody.innerHTML = '<tr><td class="px-6 py-4 text-error" colspan="5">Error al cargar usuarios.</td></tr>';
    }
  }

  function renderTable() {
    var filtered = allUsers.filter(function (u) {
      return showDisabled ? u.status === 'INACTIVE' : u.status === 'ACTIVE';
    });
    tableTitle.textContent = showDisabled ? 'Usuarios deshabilitados' : 'Usuarios activos';
    disabledBtn.textContent = showDisabled ? 'Ver activos' : 'Ver deshabilitados';

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td class="px-6 py-4 text-on-surface-variant" colspan="5">' +
        (showDisabled ? 'No hay usuarios deshabilitados.' : 'No hay usuarios activos.') + '</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(function (u) {
      var roleBadge = u.role === 'COCINERO'
        ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-surface font-label-md text-label-md">Cocinero</span>'
        : '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md">Mesero</span>';
      var statusBadge = u.status === 'ACTIVE'
        ? '<span class="text-secondary font-label-lg text-label-lg">Activo</span>'
        : '<span class="text-error font-label-lg text-label-lg">Inactivo</span>';
      var toggleLabel = u.status === 'ACTIVE' ? 'Deshabilitar' : 'Habilitar';
      var toggleClass = u.status === 'ACTIVE'
        ? 'text-error hover:underline font-label-lg text-label-lg'
        : 'text-secondary hover:underline font-label-lg text-label-lg';
      return '<tr>' +
        '<td class="px-6 py-4 font-label-lg">' + escHtml(u.fullName) + '</td>' +
        '<td class="px-6 py-4 text-on-surface-variant">' + escHtml(u.username) + '</td>' +
        '<td class="px-6 py-4">' + roleBadge + '</td>' +
        '<td class="px-6 py-4">' + statusBadge + '</td>' +
        '<td class="px-6 py-4 flex gap-3">' +
        '<button class="text-primary hover:underline font-label-lg text-label-lg" data-action="edit" data-id="' + escHtml(u.id) + '">Editar</button>' +
        '<button class="' + toggleClass + '" data-action="toggle" data-id="' + escHtml(u.id) + '" data-status="' + u.status + '">' + toggleLabel + '</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  // ── Modal ─────────────────────────────────────────────────────────────────────

  function openCreateModal() {
    editingUserId = null;
    modalTitle.textContent = 'Crear usuario';
    modalFullname.value = '';
    modalUsername.value = '';
    modalPassword.value = '';
    modalPwdLabel.textContent = 'Contraseña';
    modalPassword.placeholder = 'Mín. 6 caracteres';
    modalPassword.required = true;
    modalRoleRow.style.display = '';
    modalRole.value = 'MESERO';
    modalError.textContent = '';
    modalError.classList.add('hidden');
    modal.classList.remove('hidden');
    modalFullname.focus();
  }

  function openEditModal(userId) {
    var u = allUsers.find(function (x) { return x.id === userId; });
    if (!u) return;
    editingUserId = userId;
    modalTitle.textContent = 'Editar usuario';
    modalFullname.value = u.fullName;
    modalUsername.value = u.username;
    modalPassword.value = '';
    modalPwdLabel.textContent = 'Nueva contraseña (dejar vacío para no cambiar)';
    modalPassword.placeholder = 'Dejar vacío para no cambiar';
    modalPassword.required = false;
    modalRoleRow.style.display = 'none';
    modalError.textContent = '';
    modalError.classList.add('hidden');
    modal.classList.remove('hidden');
    modalFullname.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    editingUserId = null;
  }

  async function saveModal() {
    modalError.classList.add('hidden');
    var fullName = modalFullname.value.trim();
    var username = modalUsername.value.trim();
    var password = modalPassword.value;

    if (!fullName) { showModalError('El nombre es obligatorio.'); return; }
    if (!username) { showModalError('El usuario es obligatorio.'); return; }

    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = 'Guardando...';

    try {
      if (editingUserId) {
        var editBody = { fullName: fullName, username: username };
        if (password) editBody.password = password;
        await apiReq('PATCH', '/users/' + editingUserId, editBody);
      } else {
        if (!password || password.length < 6) { showModalError('La contraseña debe tener al menos 6 caracteres.'); return; }
        await apiReq('POST', '/users', { fullName: fullName, username: username, password: password, role: modalRole.value });
      }
      closeModal();
      await loadUsers();
    } catch (err) {
      showModalError(err.message || 'Error al guardar.');
    } finally {
      modalSaveBtn.disabled = false;
      modalSaveBtn.textContent = 'Guardar';
    }
  }

  function showModalError(msg) {
    modalError.textContent = msg;
    modalError.classList.remove('hidden');
    modalSaveBtn.disabled = false;
    modalSaveBtn.textContent = 'Guardar';
  }

  // ── Toggle status ─────────────────────────────────────────────────────────────

  async function toggleUserStatus(userId, currentStatus) {
    var newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    var label     = newStatus === 'INACTIVE' ? 'deshabilitar' : 'habilitar';
    if (!(await CB.confirm('¿Seguro que deseas ' + label + ' este usuario?', { confirmLabel: 'Confirmar' }))) return;
    try {
      await apiReq('PATCH', '/users/' + userId + '/status', { status: newStatus });
      await loadUsers();
    } catch (err) {
      CB.alert(err.message || 'Error al cambiar el estado del usuario.');
    }
  }

  // ── Event delegation ──────────────────────────────────────────────────────────

  tableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    var id     = btn.dataset.id;
    if (action === 'edit')   openEditModal(id);
    if (action === 'toggle') toggleUserStatus(id, btn.dataset.status);
  });

  createBtn.addEventListener('click', openCreateModal);
  disabledBtn.addEventListener('click', function () {
    showDisabled = !showDisabled;
    renderTable();
  });
  modalSaveBtn.addEventListener('click', saveModal);
  modalCancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  if (logoutBtn) logoutBtn.addEventListener('click', function () { CB.logout(); });

  // ── Boot ──────────────────────────────────────────────────────────────────────
  loadUsers();
})();
