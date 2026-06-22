(function () {
  var form = document.getElementById('loginForm');
  var errorBox = document.getElementById('errorBox');
  var userInput = document.getElementById('usuario');
  var passInput = document.getElementById('password');
  var togglePass = document.getElementById('togglePass');

  // Mostrar/ocultar contraseña
  togglePass.addEventListener('click', function () {
    var isPwd = passInput.type === 'password';
    passInput.type = isPwd ? 'text' : 'password';
    togglePass.querySelector('span').textContent = isPwd ? 'visibility_off' : 'visibility';
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var result = await CB.login(userInput.value, passInput.value);
    if (result.ok) {
      errorBox.classList.add('hidden');
      window.location.href = result.home;
    } else {
      errorBox.classList.remove('hidden');
      passInput.value = '';
      passInput.focus();
    }
  });

  // Si ya hay sesión válida, redirigir a su home
  if (CB.isAuthenticated() && !CB.checkSessionTimeout()) {
    var s = CB.getSession();
    CB.debug('Sesión activa detectada, redirigiendo:', s.rol);
    window.location.href = CB.homeFor(s.rol);
  }
})();
