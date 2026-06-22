/* ==========================================================================
   US-01 — Acceso al sistema por rol  |  Cevicheria Belsy — Sprint 1
   --------------------------------------------------------------------------
   TAREAS 1-8 implementadas usando el stack acordado (herramientas.docx):
     Node.js 20 + Express + PostgreSQL + Prisma + Socket.io + JWT + bcrypt
   --------------------------------------------------------------------------
   Modos:
     • API_MODE = true  → consume el backend REST (Express + Prisma + JWT)
     • API_MODE = false → fallback en memoria (mockup, sin backend)
   Cambia CB.CONFIG.API_MODE para alternar.
========================================================================== */
window.CB = window.CB || {};

CB.CONFIG = {
  APP_NAME: 'Cevicheria Belsy',
  APP_VERSION: '1.0.0-sprint1',
  API_MODE: true,
  API_BASE: (window.location.protocol === 'file:' ? 'http://localhost:3001' : window.location.origin) + '/api',
  SOCKET_URL: window.location.protocol === 'file:' ? 'http://localhost:3001' : window.location.origin,
  SESSION_TIMEOUT_MIN: 30,                 // Criterio US-01 #6
  STORAGE_KEY_USER: 'cb_usuario',
  STORAGE_KEY_ROL: 'cb_rol',
  STORAGE_KEY_LOGIN: 'cb_loginTime',
  STORAGE_KEY_ACTIVITY: 'cb_lastActivity',
  STORAGE_KEY_TOKEN: 'cb_token',
  DEBUG: true
};

/* Construye una URL absoluta para recursos servidos por el backend (imágenes en
   /uploads). Necesario para que las imágenes carguen siempre, aunque la página
   se abra como archivo local (file://) o desde un origen distinto al del servidor. */
CB.assetUrl = function (url) {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url; // ya es absoluta o embebida
  if (url.charAt(0) === '/') return CB.CONFIG.SOCKET_URL + url; // raíz → prepender el servidor
  return CB.CONFIG.SOCKET_URL + '/' + url;
};

/* ── Diálogos propios ───────────────────────────────────────────────────────
   Reemplazan a alert()/confirm() nativos del navegador, que muestran el prefijo
   "localhost:3001 dice:". Disponibles globalmente como CB.alert y CB.confirm. */
CB._escapeDialog = function (str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
};

CB.alert = function (message, opts) {
  opts = opts || {};
  var overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4';
  overlay.innerHTML =
    '<div class="bg-surface rounded-xl shadow-lg max-w-sm w-full p-6 flex flex-col gap-4">' +
      '<div class="flex items-start gap-3">' +
        '<span class="material-symbols-outlined text-' + (opts.tone || 'error') + ' mt-0.5" style="font-variation-settings:\'FILL\' 1">' + (opts.icon || 'error') + '</span>' +
        '<p class="font-body-md text-body-md text-on-surface flex-1">' + CB._escapeDialog(message) + '</p>' +
      '</div>' +
      '<div class="flex justify-end">' +
        '<button data-act="ok" class="h-11 px-5 rounded-full font-label-lg text-label-lg bg-primary text-on-primary hover:opacity-90 transition-opacity">Entendido</button>' +
      '</div>' +
    '</div>';
  function close() { overlay.remove(); }
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.getAttribute('data-act') === 'ok') close();
  });
  document.body.appendChild(overlay);
  var okBtn = overlay.querySelector('[data-act="ok"]');
  if (okBtn) okBtn.focus();
};

/* Uso flexible:
     • Promesa:  if (!(await CB.confirm('¿...?'))) return;
     • Callback: CB.confirm('¿...?', function(){ ... }, { confirmLabel: 'Sí' });
   El 2.º argumento puede ser la función onConfirm o el objeto de opciones. */
CB.confirm = function (message, onConfirm, opts) {
  if (onConfirm && typeof onConfirm === 'object') { opts = onConfirm; onConfirm = null; }
  opts = opts || {};
  return new Promise(function (resolve) {
    var settled = false;
    function finish(result) {
      if (settled) return;
      settled = true;
      overlay.remove();
      if (result && typeof onConfirm === 'function') onConfirm();
      if (!result && typeof opts.onCancel === 'function') opts.onCancel();
      resolve(result);
    }
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4';
    overlay.innerHTML =
      '<div class="bg-surface rounded-xl shadow-lg max-w-sm w-full p-6 flex flex-col gap-4">' +
        '<div class="flex items-start gap-3">' +
          '<span class="material-symbols-outlined text-primary mt-0.5" style="font-variation-settings:\'FILL\' 1">' + (opts.icon || 'help') + '</span>' +
          '<p class="font-body-md text-body-md text-on-surface flex-1">' + CB._escapeDialog(message) + '</p>' +
        '</div>' +
        '<div class="flex justify-end gap-2">' +
          '<button data-act="cancel" class="h-11 px-5 rounded-full font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">' + CB._escapeDialog(opts.cancelLabel || 'Cancelar') + '</button>' +
          '<button data-act="ok" class="h-11 px-5 rounded-full font-label-lg text-label-lg bg-primary text-on-primary hover:opacity-90 transition-opacity">' + CB._escapeDialog(opts.confirmLabel || 'Confirmar') + '</button>' +
        '</div>' +
      '</div>';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.getAttribute('data-act') === 'cancel') finish(false);
      else if (e.target.getAttribute('data-act') === 'ok') finish(true);
    });
    document.body.appendChild(overlay);
  });
};

CB._decodeJwtPayload = function (token) {
  try {
    var part = String(token || '').split('.')[1];
    if (!part) return null;
    part = part.replace(/-/g, '+').replace(/_/g, '/');
    while (part.length % 4) part += '=';
    return JSON.parse(atob(part));
  } catch (_err) {
    return null;
  }
};

CB.hasValidToken = function () {
  var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
  if (!token) return false;
  var payload = CB._decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return Date.now() < (payload.exp * 1000) - 5000;
};

CB.clearAuthSession = function () {
  sessionStorage.removeItem(CB.CONFIG.STORAGE_KEY_USER);
  sessionStorage.removeItem(CB.CONFIG.STORAGE_KEY_ROL);
  sessionStorage.removeItem(CB.CONFIG.STORAGE_KEY_LOGIN);
  sessionStorage.removeItem(CB.CONFIG.STORAGE_KEY_ACTIVITY);
  sessionStorage.removeItem(CB.CONFIG.STORAGE_KEY_TOKEN);
};

/* -------- TAREA 2/3: Modelo de datos (replica de la BD para modo mockup) -------- */
CB.hash = function (str) {
  // djb2 hash (mockup local — el backend usa bcrypt)
  var h = 5381;
  for (var i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h = h & 0xffffffff; }
  return 'h_' + (h >>> 0).toString(16);
};

CB.DB = {
  roles: [
    { id: 1, nombre: 'admin',    permisos: ['*','caja','detalle','pago'] },
    { id: 2, nombre: 'cocinero', permisos: ['cocina'] },
    { id: 3, nombre: 'mesero',   permisos: ['mapa','carta'] }
  ],
  usuarios: [
    { id: 1, username: 'admin',    passwordHash: CB.hash('12345'), nombre: 'Administrador', email: 'admin@cevicheriabelsy.pe',    rolId: 1, activo: true },
    { id: 2, username: 'cocinero', passwordHash: CB.hash('12345'), nombre: 'Cocinero',      email: 'cocinero@cevicheriabelsy.pe', rolId: 2, activo: true },
    { id: 3, username: 'mesero',   passwordHash: CB.hash('12345'), nombre: 'Mesero',        email: 'mesero@cevicheriabelsy.pe',   rolId: 3, activo: true },
    { id: 4, username: 'mesero2',  passwordHash: CB.hash('12345'), nombre: 'Mesero 2',      email: 'mesero2@cevicheriabelsy.pe',  rolId: 3, activo: true }
  ],
  sesiones: [],
  findUserByUsername: function (u) { return CB.DB.usuarios.find(function (x) { return x.username === u; }); },
  getRolById: function (id) { return CB.DB.roles.find(function (r) { return r.id === id; }); }
};

/* -------- TAREA 4: Socket.io (real-time) -------- */
CB.socket = null;
CB._rooms = [];                  // salas a las que (re)unirse en cada conexión
CB._reconnectCbs = [];           // callbacks para recargar datos tras reconectar
CB._socketConnectedBefore = false;

/* Une el socket a una sala y la recuerda para re-unirse tras CADA (re)conexión.
   El servidor pierde la membresía de la sala al reconectar, por eso no basta
   con emitir 'join:room' una sola vez al cargar la página. */
CB.joinRoom = function (room) {
  if (!room) return;
  if (CB._rooms.indexOf(room) === -1) CB._rooms.push(room);
  if (CB.socket && CB.socket.connected) CB.socket.emit('join:room', room);
};

/* Registra un callback que se ejecuta cuando el socket se RECONECTA (no en la
   primera conexión). Permite que cada pantalla recargue sus datos para recuperar
   los eventos que pudieron emitirse mientras estuvo desconectada. */
CB.onReconnect = function (cb) {
  if (typeof cb === 'function') CB._reconnectCbs.push(cb);
};

CB.initSocket = function () {
  if (typeof io === 'undefined') { CB.debug('Socket.io no disponible (se omite)'); return null; }
  try {
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    CB.socket = io(CB.CONFIG.SOCKET_URL, { autoConnect: true, reconnection: true, auth: token ? { token: token } : {} });
    CB.socket.on('connect', function () {
      CB.debug('Socket conectado:', CB.socket.id);
      // Re-unirse a todas las salas recordadas (membresía perdida al reconectar).
      CB._rooms.forEach(function (r) { CB.socket.emit('join:room', r); });
      // Tras una RECONEXIÓN, recargar datos para recuperar eventos perdidos.
      if (CB._socketConnectedBefore) {
        CB._reconnectCbs.forEach(function (cb) {
          try { cb(); } catch (e) { CB.debug('reconnect cb error:', e); }
        });
      }
      CB._socketConnectedBefore = true;
    });
    CB.socket.on('disconnect', function () { CB.debug('Socket desconectado'); });
    CB.socket.on('auth:forceLogout', function (data) { CB.debug('Logout remoto:', data); CB.logout(true); });
    return CB.socket;
  } catch (e) { CB.debug('Error socket:', e); return null; }
};

/* -------- TAREA 5: Lógica del negocio -------- */
CB.homeFor = function (rol) {
  switch (rol) {
    case 'admin':    return '../Admin/Had-01_cobro-mesas.html';
    case 'cocinero': return '../Cocinero/HCoc-01_gestion-cocina.html';
    case 'mesero':   return '../Mesero/Hme-01_mapa-mesas.html';
    default:         return '../Login/acceso-por-rol.html';
  }
};

/* Login via backend REST (Express + bcrypt + JWT) */
CB._apiLogin = async function (username, password) {
  try {
    var r = await fetch(CB.CONFIG.API_BASE + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });
    var data = await r.json();
    // Backend returns { token, role: 'ADMIN'|'MESERO'|'COCINERO', username }
    if (!r.ok || !data.token) return { ok: false, error: data.error || 'Usuario o contraseña incorrectas.' };
    sessionStorage.setItem(CB.CONFIG.STORAGE_KEY_TOKEN, data.token);
    var rol = data.role.toLowerCase(); // normalize to lowercase
    return { ok: true, user: { username: data.username }, rol: rol, home: CB.homeFor(rol) };
  } catch (e) {
    CB.debug('API no disponible, fallback a mockup local:', e.message);
    return CB._mockLogin(username, password);
  }
};

/* Login en memoria (mockup, sin backend) */
CB._mockLogin = function (username, password) {
  var u = (username || '').trim().toLowerCase();
  var user = CB.DB.findUserByUsername(u);
  if (!user || !user.activo) return { ok: false, error: 'Usuario o contraseña incorrectas.' };
  if (user.passwordHash !== CB.hash(password || '')) return { ok: false, error: 'Usuario o contraseña incorrectas.' };
  var rol = CB.DB.getRolById(user.rolId);
  return { ok: true, user: user, rol: rol.nombre, home: CB.homeFor(rol.nombre) };
};

CB.login = async function (username, password) {
  var result = CB.CONFIG.API_MODE ? await CB._apiLogin(username, password) : CB._mockLogin(username, password);
  if (result.ok) {
    var now = Date.now();
    sessionStorage.setItem(CB.CONFIG.STORAGE_KEY_USER,     result.user.username);
    sessionStorage.setItem(CB.CONFIG.STORAGE_KEY_ROL,      result.rol);
    sessionStorage.setItem(CB.CONFIG.STORAGE_KEY_LOGIN,    now.toString());
    sessionStorage.setItem(CB.CONFIG.STORAGE_KEY_ACTIVITY, now.toString());
    CB.debug('Login OK:', result.user.username, '(' + result.rol + ')');
    if (CB.socket) CB.socket.emit('auth:login', { username: result.user.username, rol: result.rol });
  } else {
    CB.debug('Login fallido:', result.error);
  }
  return result;
};

CB.logout = async function (silent) {
  var u = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_USER);
  var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
  CB.debug('Logout:', u || '(sin sesión)');
  if (CB.CONFIG.API_MODE && token) {
    try { await fetch(CB.CONFIG.API_BASE + '/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } }); } catch (e) {}
  }
  if (CB.socket && u) CB.socket.emit('auth:logout', { username: u });
  CB.clearAuthSession();
  if (!silent) {
    var path = window.location.pathname.toLowerCase();
    var prefix = (path.indexOf('/admin/') !== -1 || path.indexOf('/mesero/') !== -1 || path.indexOf('/cocinero/') !== -1)
      ? '../Login/acceso-por-rol.html' : 'acceso-por-rol.html';
    window.location.href = prefix;
  }
};

CB.getSession = function () {
  var u = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_USER);
  var r = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_ROL);
  var t = parseInt(sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_LOGIN) || '0', 10);
  var a = parseInt(sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_ACTIVITY) || '0', 10);
  if (!u || !r) return null;
  return { usuario: u, rol: r, loginTime: t, lastActivity: a };
};

CB.isAuthenticated = function () {
  return !!CB.getSession() && CB.hasValidToken();
};

CB.hasRole = function (rolesPermitidos) {
  var s = CB.getSession();
  if (!s) return false;
  if (s.rol === 'admin') return true; // criterio US-01 #7 y #8
  return rolesPermitidos.indexOf(s.rol) !== -1;
};

CB.touchActivity = function () { sessionStorage.setItem(CB.CONFIG.STORAGE_KEY_ACTIVITY, Date.now().toString()); };

CB.checkSessionTimeout = function () {
  var s = CB.getSession();
  if (!s) return false;
  if (!CB.hasValidToken()) {
    CB.debug('Sesión inválida por token expirado o corrupto');
    CB.logout();
    return true;
  }
  var elapsedMin = (Date.now() - s.lastActivity) / 60000;
  if (elapsedMin >= CB.CONFIG.SESSION_TIMEOUT_MIN) {
    CB.debug('Sesión expirada por inactividad (' + elapsedMin.toFixed(1) + ' min)');
    alert('Tu sesión ha expirado por inactividad. Vuelve a iniciar sesión.');
    CB.logout();
    return true;
  }
  return false;
};

CB.protectPage = function (rolesPermitidos) {
  if (!CB.isAuthenticated() || CB.checkSessionTimeout() || !CB.hasRole(rolesPermitidos || [])) {
    var path = window.location.pathname.toLowerCase();
    var prefix = (path.indexOf('/admin/') !== -1 || path.indexOf('/mesero/') !== -1 || path.indexOf('/cocinero/') !== -1)
      ? '../Login/acceso-por-rol.html' : 'acceso-por-rol.html';
    window.location.href = prefix;
    return false;
  }
  ['click','keydown','mousemove','scroll'].forEach(function (ev) {
    document.addEventListener(ev, CB.touchActivity, { passive: true });
  });
  setInterval(CB.checkSessionTimeout, 60000);
  return true;
};

/* -------- TAREA 8: Depuración -------- */
CB.debug = function () {
  if (!CB.CONFIG.DEBUG || !window.console) return;
  var args = Array.prototype.slice.call(arguments);
  args.unshift('[CB-AUTH]');
  console.log.apply(console, args);
};

CB.initSocket();
