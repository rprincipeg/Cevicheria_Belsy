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
  API_BASE: 'http://localhost:3001/api',
  SOCKET_URL: 'http://localhost:3001',
  SESSION_TIMEOUT_MIN: 30,                 // Criterio US-01 #6
  STORAGE_KEY_USER: 'cb_usuario',
  STORAGE_KEY_ROL: 'cb_rol',
  STORAGE_KEY_LOGIN: 'cb_loginTime',
  STORAGE_KEY_ACTIVITY: 'cb_lastActivity',
  STORAGE_KEY_TOKEN: 'cb_token',
  DEBUG: true
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
    { id: 3, username: 'mesero',   passwordHash: CB.hash('12345'), nombre: 'Mesero',        email: 'mesero@cevicheriabelsy.pe',   rolId: 3, activo: true }
  ],
  sesiones: [],
  findUserByUsername: function (u) { return CB.DB.usuarios.find(function (x) { return x.username === u; }); },
  getRolById: function (id) { return CB.DB.roles.find(function (r) { return r.id === id; }); }
};

/* -------- TAREA 4: Socket.io (real-time) -------- */
CB.socket = null;
CB.initSocket = function () {
  if (typeof io === 'undefined') { CB.debug('Socket.io no disponible (se omite)'); return null; }
  try {
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    CB.socket = io(CB.CONFIG.SOCKET_URL, { autoConnect: true, reconnection: true, auth: token ? { token: token } : {} });
    CB.socket.on('connect',    function () { CB.debug('Socket conectado:', CB.socket.id); });
    CB.socket.on('disconnect', function () { CB.debug('Socket desconectado'); });
    CB.socket.on('auth:forceLogout', function (data) { CB.debug('Logout remoto:', data); CB.logout(true); });
    return CB.socket;
  } catch (e) { CB.debug('Error socket:', e); return null; }
};

/* -------- TAREA 5: Lógica del negocio -------- */
CB.homeFor = function (rol) {
  switch (rol) {
    case 'admin':    return '../Mesero/Mapa_mesas.html';
    case 'cocinero': return '../Cocinero/Monitor_cocinero.html';
    case 'mesero':   return '../Mesero/Mapa_mesas.html';
    default:         return '../Login/Login.html';
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
  sessionStorage.clear();
  if (!silent) {
    var path = window.location.pathname.toLowerCase();
    var prefix = (path.indexOf('/admin/') !== -1 || path.indexOf('/mesero/') !== -1 || path.indexOf('/cocinero/') !== -1)
      ? '../Login/Login.html' : 'Login.html';
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

CB.isAuthenticated = function () { return !!CB.getSession(); };

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
      ? '../Login/Login.html' : 'Login.html';
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

CB.renderDebugPanel = function () {
  if (!CB.CONFIG.DEBUG) return;
  if (document.getElementById('cb-debug-panel')) return;
  if (!CB.getSession()) return;
  var panel = document.createElement('div');
  panel.id = 'cb-debug-panel';
  panel.style.cssText = 'position:fixed;bottom:12px;right:12px;background:rgba(15,23,42,.92);color:#e2e8f0;font:12px/1.4 monospace;padding:10px 12px;border-radius:8px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.3);max-width:280px;';
  function refresh() {
    var sess = CB.getSession();
    if (!sess) { panel.remove(); return; }
    var elapsed = ((Date.now() - sess.lastActivity) / 60000);
    var remaining = (CB.CONFIG.SESSION_TIMEOUT_MIN - elapsed).toFixed(1);
    panel.innerHTML = ''
      + '<div style="font-weight:700;color:#fbbf24;margin-bottom:4px;">[CB-DEBUG]</div>'
      + '<div>Modo: <b>' + (CB.CONFIG.API_MODE ? 'API REST' : 'Mockup local') + '</b></div>'
      + '<div>Usuario: <b>' + sess.usuario + '</b></div>'
      + '<div>Rol: <b>' + sess.rol + '</b></div>'
      + '<div>Expira en: <b>' + remaining + ' min</b></div>'
      + '<button id="cb-debug-logout" style="margin-top:6px;background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">Cerrar sesi&oacute;n</button>';
    var btn = panel.querySelector('#cb-debug-logout');
    if (btn) btn.onclick = function () { CB.logout(); };
  }
  refresh();
  setInterval(refresh, 5000);
  document.body.appendChild(panel);
};
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', CB.renderDebugPanel); }
else { CB.renderDebugPanel(); }

CB.initSocket();
